// live leaderboard — fetches wallet balances from the backend on load
// the backend queries the smart contract directly so the data reflects the real on-chain state
// wallet addresses are shown shortened (0x1234...5678) to keep it anonymous

import SwiftUI

// matches what the backend /leaderboard endpoint returns
struct LeaderboardEntry: Identifiable {
    let id   = UUID()
    let rank: Int
    let walletAddress: String
    let balance: Int
}

struct LeaderboardView: View {
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
                    // simple loading state while the fetch is in progress
                    Spacer()
                    HStack {
                        Spacer()
                        ProgressView()
                            .tint(Colour.bcuCyan)
                        Spacer()
                    }
                    Spacer()

                } else if !fetchError.isEmpty {
                    // show the error if the backend wasn't reachable
                    Text(fetchError)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.top, 8)

                } else {
                    VStack(spacing: 10) {
                        ForEach(leaderboardData) { entry in
                            HStack(spacing: 12) {
                                // rank badge — gold for 1st, different shades down the list
                                Text("#\(entry.rank)")
                                    .font(.headline)
                                    .foregroundColor(rankTextColour(entry.rank))
                                    .frame(width: 42, height: 42)
                                    .background(rankBgColour(entry.rank))
                                    .clipShape(Circle())

                                VStack(alignment: .leading, spacing: 4) {
                                    // show a shortened wallet address — keeps it anonymous
                                    Text(shortAddress(entry.walletAddress))
                                        .font(.headline)
                                        .foregroundColor(Colour.bcuText)
                                        .fontDesign(.monospaced)

                                    Text("\(entry.balance) BCU tokens")
                                        .font(.caption)
                                        .foregroundColor(Colour.bcuSubtext)
                                }

                                Spacer()
                            }
                            .padding(14)
                            .background(Colour.bcuCard)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Colour.bcuBorder, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
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

    // trims a full Ethereum address down to something readable — e.g. 0x1234...5678
    func shortAddress(_ addr: String) -> String {
        guard addr.count > 10 else { return addr }
        return "\(addr.prefix(6))...\(addr.suffix(4))"
    }

    // colour helpers for the rank badges — gold, silver, bronze, then plain cyan
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

    // pulls the leaderboard from the local backend
    // backend returns wallet_address and balance, already sorted highest first
    func fetchLeaderboard() {
        guard let url = URL(string: "https://bcu-backend-67y1.onrender.com/leaderboard") else { return }

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

                // parse the JSON array — each item has wallet_address and balance
                if let rawList = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    leaderboardData = rawList.enumerated().compactMap { index, item in
                        guard
                            let addr    = item["wallet_address"] as? String,
                            let balStr  = item["balance"] as? String,
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
    }
}
