require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

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

app.post("/checkin", async (req, res) => {
    const { student_email, session_id, token } = req.body;

    try {
        const { data: student, error } = await supabase
            .from("students")
            .select("*")
            .eq("email", student_email)
            .single();

        if (error || !student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const { data: session } = await supabase
            .from("sessions")
            .select("*")
            .eq("session_id", session_id)
            .eq("qr_token", token)
            .single();

        if (!session) {
            return res.status(400).json({ error: "Invalid session or token" });
        }

        await supabase.from("attendance").insert({
            student_id: student.student_id,
            session_id: session_id,
            verification_method: "QR"
        });

        const tx = await contract.recordAttendance(
            student.wallet_address,
            1
        );
        await tx.wait();

        await supabase.from("rewards").insert({
            student_id: student.student_id,
            reason: "Lecture attendance reward",
            amount: 10
        });

        res.json({ success: true, message: "Check-in successful, 10 BCU tokens awarded" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

app.get("/leaderboard", async (req, res) => {
    try {
        const { data: students } = await supabase
            .from("students")
            .select("full_name, wallet_address");

        const leaderboard = await Promise.all(
            students.map(async (student) => {
                const balance = await contract.getStudentBalance(
                    student.wallet_address
                ).catch(() => 0);

                return {
                    name: student.full_name,
                    balance: balance.toString()
                };
            })
        );

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
