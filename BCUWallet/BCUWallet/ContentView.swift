// main screen of the app — shown after launch
// has a wallet card, the last scan status, and buttons to scan a QR or view the leaderboard
// the stats at the bottom (sessions, rewards) are placeholders for now

import SwiftUI

struct ContentView: View {
    // updated whenever the QR scanner returns a result
    @State private var scannedCode: String = "No QR scanned yet"

    var body: some View {
        NavigationStack {
            ZStack {
                // background gradient pulled from the shared Colour file
                LinearGradient(
                    colors: [Colour.bcuBg, Colour.bcuBg2, Colour.bcuBg3],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(alignment: .leading, spacing: 14) {

                    Text("BCU Wallet")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Colour.bcuText)

                    Text("Blockchain attendance and rewards")
                        .font(.subheadline)
                        .foregroundColor(Colour.bcuSubtext)

                    // wallet summary card — hardcoded for the demo, would pull from Supabase in prod
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Student Wallet")
                            .font(.headline)
                            .foregroundColor(Colour.bcuText)

                        Text("luqman@bcu.ac.uk")
                            .font(.caption)
                            .foregroundColor(Colour.bcuSubtext)

                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Balance")
                                    .font(.caption2)
                                    .foregroundColor(Colour.bcuSubtext)

                                Text("10 BCU")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(Colour.bcuText)
                            }

                            Spacer()

                            Image(systemName: "wallet.pass.fill")
                                .foregroundColor(Colour.bcuCyan)
                                .padding(8)
                                .background(Colour.bcuCyanSoft)
                                .clipShape(Circle())
                        }
                    }
                    .padding(14)
                    .background(Colour.bcuCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Colour.bcuBorder, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // shows the last status message from the QR scan / check-in call
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Latest Status")
                            .font(.headline)
                            .foregroundColor(Colour.bcuText)

                        Text(scannedCode)
                            .font(.caption)
                            .foregroundColor(Colour.bcuSubtext)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Color.white.opacity(0.04))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // scan button navigates to the camera view
                    NavigationLink {
                        QRScannerView(scannedCode: $scannedCode)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "qrcode.viewfinder")
                            Text("Scan QR")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Colour.bcuCyan)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // leaderboard button — navigates to the live ranking view
                    NavigationLink {
                        LeaderboardView()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "list.number")
                            Text("View Leaderboard")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(Colour.bcuText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Colour.bcuCard)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Colour.bcuBorder, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    // stat cards at the bottom — static values, just for the demo layout
                    HStack(spacing: 8) {
                        statCard(title: "Sessions", value: "12")
                        statCard(title: "Rewards", value: "3")
                    }

                    Spacer()
                }
                .padding(.leading, 8)
                .padding(.trailing, 12)
                .padding(.top, 8)
            }
        }
    }

    // reusable card component for the small stats at the bottom
    func statCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(Colour.bcuSubtext)

            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Colour.bcuText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Colour.bcuCard)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Colour.bcuBorder, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    ContentView()
}
