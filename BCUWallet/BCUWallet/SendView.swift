import SwiftUI

private let backendURL = "https://bcu-backend-production.up.railway.app"

struct StudentItem: Identifiable {
    let id = UUID()
    let name: String
    let course: String
    let walletAddress: String
}

struct SendView: View {
    @EnvironmentObject var store: StudentStore

    @State private var allStudents: [StudentItem] = []
    @State private var searchText = ""
    @State private var picked: StudentItem? = nil
    @State private var amount = ""
    @State private var sending = false
    @State private var resultMsg = ""
    @State private var wasSuccess = false

    var filtered: [StudentItem] {
        let others = allStudents.filter { $0.walletAddress != store.walletAddress }
        if searchText.isEmpty { return others }
        return others.filter { $0.name.lowercased().contains(searchText.lowercased()) }
    }

    var body: some View {
        ZStack {
            Color(red: 5/255, green: 8/255, blue: 22/255).ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 22) {

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Send Tokens")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(Colour.bcuText)
                        Text("Balance: \(store.balance) BCU")
                            .font(.subheadline)
                            .foregroundColor(Colour.bcuSubtext)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("RECIPIENT")
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(2)
                            .foregroundColor(Colour.bcuSubtext)

                        if picked == nil {
                            TextField("Search by name...", text: $searchText)
                                .foregroundColor(Colour.bcuText)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 13)
                                .background(Colour.bcuCard)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))

                            if !filtered.isEmpty && !searchText.isEmpty {
                                VStack(spacing: 0) {
                                    ForEach(filtered.prefix(5)) { student in
                                        Button {
                                            picked = student
                                            searchText = ""
                                        } label: {
                                            HStack {
                                                VStack(alignment: .leading, spacing: 3) {
                                                    Text(student.name)
                                                        .font(.subheadline.weight(.semibold))
                                                        .foregroundColor(Colour.bcuText)
                                                    Text(student.course)
                                                        .font(.caption)
                                                        .foregroundColor(Colour.bcuSubtext)
                                                }
                                                Spacer()
                                            }
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 12)
                                            .background(Colour.bcuCard)
                                        }
                                        Divider().background(Colour.bcuBorder)
                                    }
                                }
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }

                        } else {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(picked!.name)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(Colour.bcuText)
                                    Text(shortAddress(picked!.walletAddress))
                                        .font(.system(.caption, design: .monospaced))
                                        .foregroundColor(Colour.bcuCyan)
                                }
                                Spacer()
                                Button {
                                    picked = nil
                                    resultMsg = ""
                                    amount = ""
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(Colour.bcuSubtext)
                                }
                            }
                            .padding(14)
                            .background(Colour.bcuCyanSoft)
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuCyan.opacity(0.3), lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }

                    if picked != nil {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("AMOUNT (BCU)")
                                .font(.system(size: 10, weight: .semibold))
                                .tracking(2)
                                .foregroundColor(Colour.bcuSubtext)

                            TextField("0", text: $amount)
                                .keyboardType(.numberPad)
                                .font(.system(size: 40, weight: .bold))
                                .foregroundColor(Colour.bcuText)
                                .multilineTextAlignment(.center)
                                .padding(.vertical, 20)
                                .frame(maxWidth: .infinity)
                                .background(Colour.bcuCard)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))

                            Text("Must be a multiple of 10 e.g. 10, 50, 100")
                                .font(.caption)
                                .foregroundColor(Colour.bcuSubtext)
                        }

                        if !resultMsg.isEmpty {
                            Text(resultMsg)
                                .font(.caption)
                                .foregroundColor(wasSuccess ? .green : .red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button {
                            sendTokens()
                        } label: {
                            Group {
                                if sending {
                                    ProgressView().tint(.black)
                                } else {
                                    HStack(spacing: 8) {
                                        Image(systemName: "paperplane.fill")
                                        Text("Send Tokens")
                                            .fontWeight(.semibold)
                                    }
                                }
                            }
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                        }
                        .background(Colour.bcuCyan)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: Colour.bcuCyan.opacity(0.3), radius: 10, y: 4)
                        .disabled(sending)
                    }
                }
                .padding(24)
            }
        }
        .navigationTitle("Send")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchStudents() }
    }

    func shortAddress(_ addr: String) -> String {
        guard addr.count > 10 else { return addr }
        return "\(addr.prefix(6))...\(addr.suffix(4))"
    }

    func fetchStudents() {
        guard let url = URL(string: "\(backendURL)/students") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
            else { return }

            let parsed = list.compactMap { item -> StudentItem? in
                guard let name = item["full_name"] as? String,
                      let wallet = item["wallet_address"] as? String,
                      let course = item["course"] as? String
                else { return nil }
                return StudentItem(name: name, course: course, walletAddress: wallet)
            }
            DispatchQueue.main.async { allStudents = parsed }
        }.resume()
    }

    func sendTokens() {
        guard let recipient = picked,
              let amt = Int(amount), amt > 0, amt % 10 == 0
        else {
            resultMsg = "Amount must be a multiple of 10 (e.g. 10, 50, 100)"
            wasSuccess = false
            return
        }

        sending = true
        resultMsg = ""

        let body: [String: Any] = [
            "from_address": store.walletAddress,
            "to_address": recipient.walletAddress,
            "amount": amt
        ]

        guard let url = URL(string: "\(backendURL)/transfer") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: req) { data, _, _ in
            DispatchQueue.main.async {
                sending = false
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                else {
                    resultMsg = "Request failed"; wasSuccess = false; return
                }

                if let msg = json["message"] as? String {
                    resultMsg = msg
                    wasSuccess = true
                    amount = ""
                } else if let err = json["error"] as? String {
                    resultMsg = err
                    wasSuccess = false
                }
            }
        }.resume()
    }
}

