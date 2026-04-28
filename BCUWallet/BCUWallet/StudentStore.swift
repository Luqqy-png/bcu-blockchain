import SwiftUI
import Combine

@MainActor
class StudentStore: ObservableObject {
    @Published var email = ""
    @Published var fullName = ""
    @Published var course = ""
    @Published var walletAddress = ""
    @Published var balance = "0"

    var isLoggedIn: Bool { !email.isEmpty }

    var firstName: String { fullName.split(separator: " ").first.map(String.init) ?? fullName }

    init() { load() }

    func save() {
        UserDefaults.standard.set(email, forKey: "student_email")
        UserDefaults.standard.set(fullName, forKey: "student_fullName")
        UserDefaults.standard.set(course, forKey: "student_course")
        UserDefaults.standard.set(walletAddress, forKey: "student_walletAddress")
    }

    func load() {
        email = UserDefaults.standard.string(forKey: "student_email") ?? ""
        fullName = UserDefaults.standard.string(forKey: "student_fullName") ?? ""
        course = UserDefaults.standard.string(forKey: "student_course") ?? ""
        walletAddress = UserDefaults.standard.string(forKey: "student_walletAddress") ?? ""
    }

    func signOut() {
        email = ""; fullName = ""; course = ""; walletAddress = ""; balance = "0"
        ["student_email", "student_fullName", "student_course", "student_walletAddress"].forEach {
            UserDefaults.standard.removeObject(forKey: $0)
        }
    }
}
