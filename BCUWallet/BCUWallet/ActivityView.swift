import SwiftUI

private let backendURL = "https://bcu-backend-production.up.railway.app"

struct ActivityItem: Identifiable {
    let id = UUID()
    let reason: String
    let amount: Int
    let date: String
}

struct ActivityView: View {
    @EnvironmentObject var store: StudentStore

    @State private var items: [ActivityItem] = []
    @State private var loading = true

    var body: some View {
        ZStack {
            Color(red: 5/255, green: 8/255, blue: 22/255).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                Text("Activity")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Colour.bcuText)
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    .padding(.bottom, 4)

                Text("Your token history")
                    .font(.subheadline)
                    .foregroundColor(Colour.bcuSubtext)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)

                if loading {
                    Spacer()
                    HStack {
                        Spacer()
                        ProgressView().tint(Colour.bcuCyan)
                        Spacer()
                    }
                    Spacer()

                } else if items.isEmpty {
                    Spacer()
                    Text("No activity yet")
                        .font(.subheadline)
                        .foregroundColor(Colour.bcuSubtext)
                        .frame(maxWidth: .infinity)
                    Spacer()

                } else {
                    ScrollView {
                        VStack(spacing: 10) {
                            ForEach(items) { item in
                                HStack(spacing: 12) {
                                    Image(systemName: item.amount >= 0 ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(item.amount >= 0 ? .green : .red)

                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(item.reason)
                                            .font(.subheadline)
                                            .foregroundColor(Colour.bcuText)
                                            .lineLimit(2)
                                        if !item.date.isEmpty {
                                            Text(item.date)
                                                .font(.caption2)
                                                .foregroundColor(Colour.bcuSubtext)
                                        }
                                    }

                                    Spacer()

                                    Text(item.amount >= 0 ? "+\(item.amount)" : "\(item.amount)")
                                        .font(.headline.weight(.bold))
                                        .foregroundColor(item.amount >= 0 ? .green : .red)
                                }
                                .padding(14)
                                .background(Colour.bcuCard)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Colour.bcuBorder, lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 20)
                    }
                }
            }
        }
        .onAppear { fetchActivity() }
    }

    func formatDate(_ iso: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        let trimmed = String(iso.prefix(19))
        guard let date = formatter.date(from: trimmed) else { return "" }
        formatter.dateFormat = "d MMM yyyy, HH:mm"
        return formatter.string(from: date)
    }

    func fetchActivity() {
        let encoded = store.email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        guard let url = URL(string: "\(backendURL)/activity?email=\(encoded)") else { return }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                loading = false
                guard let data = data,
                      let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
                else { return }

                items = list.compactMap { item in
                    guard let reason = item["reason"] as? String,
                          let amount = item["amount"] as? Int
                    else { return nil }
                    let dateStr = item["created_at"] as? String ?? ""
                    return ActivityItem(reason: reason, amount: amount, date: formatDate(dateStr))
                }
            }
        }.resume()
    }
}

