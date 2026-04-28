import SwiftUI

private let backendURL = "https://bcu-backend-production.up.railway.app"

struct ContentView: View {
    @EnvironmentObject var store: StudentStore
    @State private var scannedCode = ""

    var body: some View {
        ZStack {
            Color(red: 5/255, green: 8/255, blue: 22/255).ignoresSafeArea()

            VStack(spacing: 0) {

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("BCU WALLET")
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(3)
                            .foregroundColor(Colour.bcuCyan)
                        Text("Hey, \(store.firstName)")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Colour.bcuText)
                    }
                    Spacer()
                    Button { store.signOut() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red.opacity(0.7))
                            .padding(10)
                            .background(Color.red.opacity(0.08))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                HStack {
                    Text(store.course)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(Colour.bcuCyan)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Colour.bcuCyanSoft)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Colour.bcuCyan.opacity(0.3), lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)

                Spacer()

                VStack(spacing: 8) {
                    Text(store.balance)
                        .font(.system(size: 72, weight: .black))
                        .foregroundColor(.white)
                    Text("BCU Tokens")
                        .font(.subheadline)
                        .foregroundColor(Colour.bcuSubtext)
                }

                Spacer()

                HStack(spacing: 6) {
                    Image(systemName: "wallet.pass.fill")
                        .font(.caption2)
                        .foregroundColor(Colour.bcuCyan)
                    Text(shortAddress(store.walletAddress))
                        .font(.system(.caption, design: .monospaced).weight(.medium))
                        .foregroundColor(Colour.bcuSubtext)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.05))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Colour.bcuBorder, lineWidth: 1))
                .padding(.bottom, 40)

                HStack(spacing: 48) {
                    NavigationLink { SendView() } label: {
                        VStack(spacing: 8) {
                            Image(systemName: "paperplane.fill")
                                .font(.title3)
                                .foregroundColor(.black)
                                .frame(width: 60, height: 60)
                                .background(Colour.bcuCyan)
                                .clipShape(Circle())
                                .shadow(color: Colour.bcuCyan.opacity(0.4), radius: 12, y: 4)
                            Text("Send")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(Colour.bcuSubtext)
                        }
                    }

                    NavigationLink {
                        QRScannerView(scannedCode: $scannedCode, studentEmail: store.email)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: "qrcode.viewfinder")
                                .font(.title3)
                                .foregroundColor(.black)
                                .frame(width: 60, height: 60)
                                .background(Colour.bcuCyan)
                                .clipShape(Circle())
                                .shadow(color: Colour.bcuCyan.opacity(0.4), radius: 12, y: 4)
                            Text("Scan QR")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(Colour.bcuSubtext)
                        }
                    }
                }

                if !scannedCode.isEmpty {
                    Text(scannedCode)
                        .font(.caption)
                        .foregroundColor(Colour.bcuSubtext)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.top, 16)
                }

                Spacer(minLength: 32)
            }
        }
        .onAppear { fetchBalance() }
    }

    func shortAddress(_ addr: String) -> String {
        guard addr.count > 10 else { return addr }
        return "\(addr.prefix(6))...\(addr.suffix(4))"
    }

    func fetchBalance() {
        guard !store.walletAddress.isEmpty,
              let encoded = store.walletAddress.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(backendURL)/balance?address=\(encoded)") else { return }

        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let bal = json["balance"] as? String
            else { return }
            DispatchQueue.main.async { store.balance = bal }
        }.resume()
    }
}

