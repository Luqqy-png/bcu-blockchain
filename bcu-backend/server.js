// BCU Blockchain backend - Node.js + Express
// handles check-ins, wallet creation, token rewards, leaderboard and student profiles
// runs on port 3000, connects to Supabase and Sepolia testnet via Alchemy

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// quick health check so I can tell if the server is up without checking logs
app.get("/health", (req, res) => {
    res.json({ status: "BCU backend is running" });
});

// using the service role key here so the backend can bypass Supabase RLS
// the anon key is kept for the frontend only
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// connect to Sepolia via Alchemy and load the deployed contract
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// only need the three functions we actually call - no point importing the full ABI
const contractABI = [
    "function recordAttendance(address student, uint256 sessionId) public",
    "function rewardAcademicPerformance(address student, uint256 grade) public",
    "function getStudentBalance(address student) public view returns (uint256)"
];

const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractABI,
    wallet
);

// POST /checkin - called when a student scans a QR code
// checks the token is valid, records attendance on chain, then rotates the QR so it can't be reused
app.post("/checkin", async (req, res) => {
    const { student_email, token } = req.body;

    try {
        // look up the student by email to get their wallet address
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("email", student_email)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // find the session using just the token - it's unique so no need for session_id too
        // also check the expiry so old tokens don't work
        const { data: session } = await supabase
            .from("sessions")
            .select("*")
            .eq("qr_token", token)
            .gt("qr_expires_at", new Date().toISOString())
            .single();

        if (!session) {
            return res.status(400).json({ error: "Invalid or expired QR code" });
        }

        // stop the same student scanning twice for the same session
        const { data: alreadyIn } = await supabase
            .from("attendance")
            .select("attendance_id")
            .eq("student_id", student.student_id)
            .eq("session_id", session.session_id)
            .single();

        if (alreadyIn) {
            return res.status(409).json({ error: "Already checked in for this session" });
        }

        // write the attendance record to Supabase
        await supabase.from("attendance").insert({
            student_id: student.student_id,
            session_id: session.session_id,
            verification_method: "QR"
        });

        // the smart contract needs a uint256 for the session ID but ours is a UUID string
        // so I take the first 16 hex chars and convert to BigInt - stays unique per session
        const numericSessionId = BigInt("0x" + session.session_id.replace(/-/g, "").slice(0, 16));
        const tx = await contract.recordAttendance(student.wallet_address, numericSessionId);
        await tx.wait();

        // log the reward in Supabase as well so the leaderboard data is consistent
        await supabase.from("rewards").insert({
            student_id: student.student_id,
            reason: "Lecture attendance reward",
            amount: 10
        });

        // rotate the token straight away so nobody else can use the same QR code
        // the portal picks this up via Supabase Realtime and re-renders automatically
        const newToken = require("crypto").randomUUID().replace(/-/g, "");
        await supabase.from("sessions")
            .update({
                qr_token: newToken,
                qr_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            })
            .eq("session_id", session.session_id);

        res.json({ success: true, message: "Check-in successful, 10 BCU tokens awarded" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// POST /setup-student
// called after a student registers via Supabase auth on the frontend
// generates an Ethereum wallet locally and saves everything to Supabase
app.post("/setup-student", async (req, res) => {
    const { email, full_name, course } = req.body;

    if (!email || !email.endsWith("@bcu.ac.uk")) {
        return res.status(400).json({ error: "Must use a BCU email address (@bcu.ac.uk)" });
    }

    try {
        // check they haven't already registered
        const { data: existing } = await supabase
            .from("students")
            .select("student_id")
            .eq("email", email)
            .single();

        if (existing) {
            return res.status(409).json({ error: "A wallet already exists for this email" });
        }

        // createRandom generates a wallet entirely offline - no API call needed here
        // the teacher's wallet handles gas when minting so students don't need ETH
        const studentWallet = ethers.Wallet.createRandom();

        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({ full_name, email, course, wallet_address: studentWallet.address })
            .select()
            .single();

        if (studentError) {
            return res.status(500).json({ error: studentError.message });
        }

        // also write a row to the wallets table to track balance separately
        await supabase.from("wallets").insert({
            student_id: student.student_id,
            balance: 0
        });

        res.json({
            success: true,
            wallet_address: studentWallet.address,
            message: "Wallet created. Check your BCU email to confirm your account."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// POST /register-teacher
// the frontend handles Supabase auth (signUp) then calls this to save the teacher profile
// keeping auth client-side avoids issues with the admin SDK on different package versions
app.post("/register-teacher", async (req, res) => {
    const { email, full_name, course } = req.body;

    if (!email || !email.endsWith("@bcu.ac.uk")) {
        return res.status(400).json({ error: "Must use a BCU email address (@bcu.ac.uk)" });
    }

    try {
        // don't let the same teacher register twice
        const { data: existing } = await supabase
            .from("teachers")
            .select("teacher_id")
            .eq("email", email)
            .single();

        if (existing) {
            return res.status(409).json({ error: "A teacher account already exists for this email" });
        }

        const { error: insertError } = await supabase
            .from("teachers")
            .insert({ email, full_name, course });

        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        res.json({ success: true, message: "Teacher account created" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// GET /teacher-profile
// returns the teacher's name and course after they log in
// used by the portal to know which students to show in the rewards tab
app.get("/teacher-profile", async (req, res) => {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const { data, error } = await supabase
            .from("teachers")
            .select("full_name, course")
            .eq("email", email)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: "Teacher profile not found" });
        }

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// GET /student-profile
// called by the iOS app after login to get the student's wallet and course details
app.get("/student-profile", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const { data, error } = await supabase
            .from("students")
            .select("student_id, full_name, email, course, wallet_address")
            .eq("email", email)
            .single();

        if (error || !data) return res.status(404).json({ error: "Student not found" });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// GET /balance - returns the on-chain token balance for a single wallet address
app.get("/balance", async (req, res) => {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        const balance = await contract.getStudentBalance(address);
        res.json({ balance: balance.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch balance" });
    }
});

// POST /reward
// lets a teacher send academic performance tokens to a student
// checks the teacher is actually assigned to that student's course before doing anything
app.post("/reward", async (req, res) => {
    const { student_id, grade, teacher_email } = req.body;

    if (!grade || grade < 1 || grade > 100) {
        return res.status(400).json({ error: "Grade must be between 1 and 100" });
    }

    try {
        // get the teacher's course so we can check it matches the student's
        const { data: teacher } = await supabase
            .from("teachers")
            .select("course")
            .eq("email", teacher_email)
            .single();

        if (!teacher) {
            return res.status(403).json({ error: "Teacher account not found" });
        }

        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("student_id", student_id)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // teachers can only reward students on their own course
        if (teacher.course !== student.course) {
            return res.status(403).json({ error: "You can only reward students enrolled in your course" });
        }

        // use today's date in the reason so a student can only be rewarded once per day
        const today = new Date().toISOString().split("T")[0];
        const rewardReason = `Academic reward: ${today}`;
        const { data: alreadyRewarded } = await supabase
            .from("rewards")
            .select("reward_id")
            .eq("student_id", student_id)
            .eq("reason", rewardReason)
            .single();

        if (alreadyRewarded) {
            return res.status(409).json({ error: `${student.full_name} has already received a reward today` });
        }

        // grade × 10 = tokens, so 80% = 800 BCU, 100% = 1000 BCU (the max)
        const tx = await contract.rewardAcademicPerformance(student.wallet_address, grade);
        await tx.wait();

        const tokenAmount = grade * 10;

        await supabase.from("rewards").insert({
            student_id,
            reason: rewardReason,
            amount: tokenAmount
        });

        res.json({
            success: true,
            message: `${tokenAmount} BCU tokens awarded to ${student.full_name}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// GET /students
// returns all students, optionally filtered by course
// the teacher portal passes ?course= so it only shows their own students
app.get("/students", async (req, res) => {
    const { course } = req.query;

    try {
        let query = supabase
            .from("students")
            .select("student_id, full_name, email, course, wallet_address");

        if (course) {
            query = query.eq("course", course);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// GET /activity - returns the token history for a student
app.get("/activity", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const { data: student } = await supabase
            .from("students")
            .select("student_id")
            .eq("email", email)
            .single();

        if (!student) return res.status(404).json({ error: "Student not found" });

        const { data, error } = await supabase
            .from("rewards")
            .select("reason, amount, created_at")
            .eq("student_id", student.student_id)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// POST /transfer - student to student token transfer
// mints to the recipient on chain, logs both sides in supabase
app.post("/transfer", async (req, res) => {
    const { from_address, to_address, amount } = req.body;

    if (!from_address || !to_address || !amount || amount < 10) {
        return res.status(400).json({ error: "Invalid transfer details" });
    }

    if (from_address === to_address) {
        return res.status(400).json({ error: "You can't send tokens to yourself" });
    }

    try {
        // check the sender actually has enough tokens on chain
        const balance = await contract.getStudentBalance(from_address).catch(() => 0);
        if (Number(balance) < amount) {
            return res.status(400).json({ error: "Not enough tokens to send" });
        }

        const { data: sender } = await supabase
            .from("students")
            .select("student_id, full_name")
            .eq("wallet_address", from_address)
            .single();

        const { data: recipient } = await supabase
            .from("students")
            .select("student_id, full_name")
            .eq("wallet_address", to_address)
            .single();

        if (!sender || !recipient) {
            return res.status(404).json({ error: "Student not found" });
        }

        // rewardAcademicPerformance mints grade * 10 tokens
        // so dividing amount by 10 gives the right grade value to pass in
        const grade = amount / 10;
        const tx = await contract.rewardAcademicPerformance(to_address, grade);
        await tx.wait();

        await supabase.from("rewards").insert({
            student_id: sender.student_id,
            reason: `Sent ${amount} tokens to ${recipient.full_name}`,
            amount: -amount
        });

        await supabase.from("rewards").insert({
            student_id: recipient.student_id,
            reason: `Received ${amount} tokens from ${sender.full_name}`,
            amount: amount
        });

        res.json({ success: true, message: `${amount} BCU tokens sent to ${recipient.full_name}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Transfer failed" });
    }
});

// GET /leaderboard
// pulls all student wallet addresses from Supabase then gets their live token balance
// from the blockchain directly - this way the data can't be manipulated in the DB
app.get("/leaderboard", async (req, res) => {
    try {
        const { data: students } = await supabase
            .from("students")
            .select("wallet_address");

        const leaderboard = await Promise.all(
            students.map(async (student) => {
                // catch individual failures so one bad address doesn't break the whole list
                const balance = await contract.getStudentBalance(
                    student.wallet_address
                ).catch(() => 0);

                return {
                    wallet_address: student.wallet_address,
                    balance: balance.toString()
                };
            })
        );

        // sort highest to lowest before sending back
        leaderboard.sort((a, b) => b.balance - a.balance);

        res.json(leaderboard);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BCU backend running on port ${PORT}`);
});
