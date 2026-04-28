import SwiftUI

struct LeaderboardEntry: Identifiable {
    let id = UUID()
    let rank: Int
    let walletAddress: String
    let balance: Int
}

struct LeaderboardView: View {
    @EnvironmentObject var store: StudentStore
    @State private var leaderboardData: [LeaderboardEntry] = []
    @State private var isLoading = true
    @State private var fetchError = ""

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Colour.bcuBg, Colour.bcuBg2, Colour.bcuBg3],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text("Leaderboard")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Colour.bcuText)

                Text("Top student wallet holders")
                    .font(.subheadline)
                    .foregroundColor(Colour.bcuSubtext)

                if isLoading {
                    Spacer()
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Colour.bcuCyan)
                        Spacer()
                    }
                    Spacer()

                } else if !fetchError.isEmpty {
                    Text(fetchError)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.top, 8)

                } else if leaderboardData.isEmpty {
                    Spacer()
                    Text("No data yet")
                        .font(.subheadline)
                        .foregroundColor(Colour.bcuSubtext)
                        .frame(maxWidth: .infinity)
                    Spacer()

                } else {
                    ScrollView {
                        VStack(spacing: 10) {
                            ForEach(leaderboardData) { entry in
                                let isYou = entry.walletAddress == store.walletAddress
                                HStack(spacing: 12) {
                                    Text("#\(entry.rank)")
                                        .font(.headline)
                                        .foregroundColor(rankTextColour(entry.rank))
                                        .frame(width: 42, height: 42)
                                        .background(rankBgColour(entry.rank))
                                        .clipShape(Circle())

                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack(spacing: 6) {
                                            Text(shortAddress(entry.walletAddress))
                                                .font(.headline)
                                                .foregroundColor(Colour.bcuText)
                                                .fontDesign(.monospaced)
                                            if isYou {
                                                Text("You")
                                                    .font(.caption2.weight(.semibold))
                                                    .foregroundColor(Colour.bcuCyan)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Colour.bcuCyanSoft)
                                                    .clipShape(Capsule())
                                            }
                                        }

                                        Text("\(entry.balance) BCU tokens")
                                            .font(.caption)
                                            .foregroundColor(Colour.bcuSubtext)
                                    }

                                    Spacer()
                                }
                                .padding(14)
                                .background(isYou ? Colour.bcuCyanSoft : Colour.bcuCard)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(isYou ? Colour.bcuCyan.opacity(0.3) : Colour.bcuBorder, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                        }
                        .padding(.bottom, 20)
                    }
                }

                Spacer()
            }
            .padding(.leading, 8)
            .padding(.trailing, 12)
            .padding(.top, 8)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            fetchLeaderboard()
        }
    }

    func shortAddress(_ addr: String) -> String {
        guard addr.count > 10 else { return addr }
        return "\(addr.prefix(6))...\(addr.suffix(4))"
    }

    func rankTextColour(_ rank: Int) -> Color {
        switch rank {
        case 1: return Color(red: 250/255, green: 204/255, blue: 21/255)
        case 2: return Color(red: 203/255, green: 213/255, blue: 225/255)
        case 3: return Color(red: 251/255, green: 146/255, blue: 60/255)
        default: return Colour.bcuCyan
        }
    }

    func rankBgColour(_ rank: Int) -> Color {
        switch rank {
        case 1: return Color(red: 250/255, green: 204/255, blue: 21/255).opacity(0.15)
        case 2: return Color(red: 203/255, green: 213/255, blue: 225/255).opacity(0.15)
        case 3: return Color(red: 251/255, green: 146/255, blue: 60/255).opacity(0.15)
        default: return Colour.bcuCyanSoft
        }
    }

    func fetchLeaderboard() {
        guard let url = URL(string: "https://bcu-backend-production.up.railway.app/leaderboard") else { return }

        URLSession.shared.dataTask(with: url) { data, _, error in
            DispatchQueue.main.async {
                isLoading = false

                if let error = error {
                    fetchError = "Could not reach backend: \(error.localizedDescription)"
                    return
                }

                guard let data = data else {
                    fetchError = "No data received from server"
                    return
                }

                if let rawList = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    leaderboardData = rawList.enumerated().compactMap { index, item in
                        guard let addr = item["wallet_address"] as? String,
                              let balStr = item["balance"] as? String,
                              let balance = Int(balStr)
                        else { return nil }

                        return LeaderboardEntry(rank: index + 1, walletAddress: addr, balance: balance)
                    }
                } else {
                    fetchError = "Failed to parse leaderboard data"
                }
            }
        }.resume()
    }
}

#Preview {
    NavigationStack {
        LeaderboardView()
            .environmentObject(StudentStore())
    }
}

