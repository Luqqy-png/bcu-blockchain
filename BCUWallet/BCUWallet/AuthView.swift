import SwiftUI

private let BCU_COURSES = [
    "Accounting and Finance", "Architecture", "Artificial Intelligence",
    "Biomedical Science", "Business Management", "Civil Engineering",
    "Computer Science", "Creative Writing", "Criminology", "Cyber Security",
    "Data Science", "Digital Marketing", "Education",
    "Electrical and Electronic Engineering", "Fashion Design", "Film Production",
    "Forensic Science", "Games Technology", "Graphic Design", "Health and Social Care",
    "Interior Design", "International Business", "Journalism", "Law", "Marketing",
    "Mechanical Engineering", "Media and Communication", "Music Technology",
    "Nursing", "Physiotherapy", "Product Design", "Psychology", "Social Work",
    "Software Engineering", "Sport and Exercise Science", "Web Development and Design"
]

private let supabaseURL = "https://plarqjhvyepfkhxxpmrc.supabase.co"
private let supabaseAnon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYXJxamh2eWVwZmtoeHhwbXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDQ5NzEsImV4cCI6MjA5MDcyMDk3MX0.IhkJOxqo-Utj3oUtBKrI2-OiKUJDtpw4P9eFatNYUoI"
private let backendURL = "https://bcu-backend-production.up.railway.app"

struct AuthView: View {
    @EnvironmentObject var store: StudentStore

    @State private var isRegister = false
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var course = BCU_COURSES[0]
    @State private var loading = false
    @State private var errorMsg = ""
    @State private var regDone = false
    @State private var showPicker = false

    var body: some View {
        ZStack {
            LinearGradient(colors: [Colour.bcuBg, Colour.bcuBg2, Colour.bcuBg3],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("BIRMINGHAM CITY UNIVERSITY")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(3)
                        .foregroundColor(Colour.bcuCyan)
                        .padding(.top, 60)

                    Text(isRegister ? "Create account" : "Student sign in")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(Colour.bcuText)
                        .padding(.top, 12)

                    Text(isRegister
                         ? "Register with your BCU email to get your blockchain wallet"
                         : "Sign in to view your wallet and BCU token balance")
                        .font(.subheadline)
                        .foregroundColor(Colour.bcuSubtext)
                        .padding(.top, 6)

                    if regDone {
                        VStack(spacing: 16) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 56))
                                .foregroundColor(.green)

                            Text("Registration successful")
                                .font(.title2.bold())
                                .foregroundColor(Colour.bcuText)

                            Text("Your blockchain wallet has been created. Sign in to access your account.")
                                .font(.subheadline)
                                .foregroundColor(Colour.bcuSubtext)
                                .multilineTextAlignment(.center)

                            Button("Sign in") {
                                isRegister = false
                                regDone = false
                                errorMsg = ""
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Colour.bcuCyan)
                            .foregroundColor(.black)
                            .fontWeight(.semibold)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(24)
                        .background(Colour.bcuCard)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Colour.bcuBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .padding(.top, 32)

                    } else {
                        VStack(spacing: 14) {
                            if isRegister {
                                field(placeholder: "Full name", text: $fullName)
                            }

                            field(placeholder: "BCU email address", text: $email, keyboard: .emailAddress)
                            secureField(placeholder: "Password", text: $password)

                            if isRegister {
                                Button {
                                    showPicker = true
                                } label: {
                                    HStack {
                                        Text(course)
                                            .foregroundColor(Colour.bcuText)
                                            .font(.subheadline)
                                        Spacer()
                                        Image(systemName: "chevron.down")
                                            .foregroundColor(Colour.bcuSubtext)
                                            .font(.caption)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 14)
                                    .background(Colour.bcuCard)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                }
                            }

                            if !errorMsg.isEmpty {
                                Text(errorMsg)
                                    .font(.caption)
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            Button {
                                isRegister ? register() : login()
                            } label: {
                                Group {
                                    if loading {
                                        ProgressView().tint(.black)
                                    } else {
                                        Text(isRegister ? "Create account" : "Sign in")
                                            .fontWeight(.semibold)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                            }
                            .background(Colour.bcuCyan)
                            .foregroundColor(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .disabled(loading)

                            Button {
                                isRegister.toggle()
                                errorMsg = ""
                            } label: {
                                Text(isRegister ? "Already have an account? Sign in" : "No account yet? Create one")
                                    .font(.footnote)
                                    .foregroundColor(Colour.bcuCyan)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .padding(24)
                        .background(Colour.bcuCard)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Colour.bcuBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .padding(.top, 32)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .sheet(isPresented: $showPicker) {
            VStack {
                Text("Select your course")
                    .font(.headline)
                    .padding(.top, 20)

                Picker("Course", selection: $course) {
                    ForEach(BCU_COURSES, id: \.self) { Text($0) }
                }
                .pickerStyle(.wheel)

                Button("Done") { showPicker = false }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Colour.bcuCyan)
                    .foregroundColor(.black)
                    .fontWeight(.semibold)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .padding(.horizontal, 24)
                    .padding(.bottom, 30)
            }
            .presentationDetents([.medium])
        }
    }

    func field(placeholder: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        TextField(placeholder, text: text)
            .keyboardType(keyboard)
            .autocapitalization(.none)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Colour.bcuCard)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .foregroundColor(Colour.bcuText)
    }

    func secureField(placeholder: String, text: Binding<String>) -> some View {
        SecureField(placeholder, text: text)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Colour.bcuCard)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .foregroundColor(Colour.bcuText)
    }

    func register() {
        guard email.hasSuffix("@bcu.ac.uk") else {
            errorMsg = "You must have a BCU email address"; return
        }
        guard !fullName.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMsg = "Enter your full name"; return
        }

        loading = true; errorMsg = ""

        supabaseSignUp(email: email, password: password) { success, err in
            guard success else {
                DispatchQueue.main.async { errorMsg = err ?? "Sign up failed"; loading = false }
                return
            }
            let body: [String: Any] = ["email": email, "full_name": fullName, "course": course]
            postJSON(url: "\(backendURL)/setup-student", body: body) { data, statusCode in
                DispatchQueue.main.async {
                    loading = false
                    if statusCode == 200 || statusCode == 201 {
                        regDone = true
                    } else {
                        errorMsg = (data?["error"] as? String) ?? "Failed to create wallet"
                    }
                }
            }
        }
    }

    func login() {
        guard !email.isEmpty, !password.isEmpty else { errorMsg = "Fill in all fields"; return }
        loading = true; errorMsg = ""

        supabaseSignIn(email: email, password: password) { success, err in
            guard success else {
                DispatchQueue.main.async { errorMsg = err ?? "Sign in failed"; loading = false }
                return
            }

            guard let url = URL(string: "\(backendURL)/student-profile?email=\(email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }

            URLSession.shared.dataTask(with: url) { data, _, _ in
                DispatchQueue.main.async {
                    loading = false
                    guard let data = data,
                          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let name = json["full_name"] as? String,
                          let crs = json["course"] as? String,
                          let wallet = json["wallet_address"] as? String
                    else {
                        errorMsg = "No student profile found for this account"
                        return
                    }

                    store.email = email
                    store.fullName = name
                    store.course = crs
                    store.walletAddress = wallet
                    store.save()
                }
            }.resume()
        }
    }

    func supabaseSignUp(email: String, password: String, completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: "\(supabaseURL)/auth/v1/signup") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(supabaseAnon, forHTTPHeaderField: "apikey")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { completion(false, "Network error"); return }

            if let errMsg = json["error_description"] as? String ?? json["msg"] as? String {
                completion(false, errMsg)
            } else {
                completion(true, nil)
            }
        }.resume()
    }

    func supabaseSignIn(email: String, password: String, completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=password") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(supabaseAnon, forHTTPHeaderField: "apikey")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { completion(false, "Network error"); return }

            if json["access_token"] != nil {
                completion(true, nil)
            } else {
                let msg = json["error_description"] as? String ?? "Invalid email or password"
                completion(false, msg)
            }
        }.resume()
    }

    func postJSON(url: String, body: [String: Any], completion: @escaping ([String: Any]?, Int) -> Void) {
        guard let u = URL(string: url) else { return }
        var req = URLRequest(url: u)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: req) { data, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            completion(json, code)
        }.resume()
    }
}

