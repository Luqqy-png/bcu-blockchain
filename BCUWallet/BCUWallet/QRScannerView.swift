// bridges ScannerViewController (UIKit) into a SwiftUI view using UIViewControllerRepresentable
// the Coordinator acts as the delegate — when a QR is found it sends the token to the backend

import SwiftUI
import AVFoundation

struct QRScannerView: UIViewControllerRepresentable {

    @Binding var scannedCode: String

    func makeUIViewController(context: Context) -> ScannerViewController {
        let vc = ScannerViewController()
        vc.delegate = context.coordinator
        return vc
    }

    // nothing to update after creation — the capture session runs continuously
    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, ScannerDelegate {
        var parent: QRScannerView

        init(_ parent: QRScannerView) {
            self.parent = parent
        }

        // called by ScannerViewController as soon as a QR code is detected
        func didFind(code: String) {
            print("QR detected:", code)
            parent.scannedCode = code
            sendToBackend(code: code)
        }

        // POSTs the scanned token to the backend checkin endpoint
        // the backend looks up the session using just the token — no session_id needed
        func sendToBackend(code: String) {
            let backendBaseURL = "https://bcu-backend-production.up.railway.app/checkin"
            guard let url = URL(string: backendBaseURL) else {
                print("Bad URL")
                return
            }

            // only sending student_email and token — backend resolves the session from the token alone
            let body: [String: Any] = [
                "student_email": "luqman@bcu.ac.uk",
                "token": code
            ]

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)

            URLSession.shared.dataTask(with: request) { data, response, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self.parent.scannedCode = "Request error: \(error.localizedDescription)"
                    }
                    print("Request error:", error.localizedDescription)
                    return
                }

                if let data = data,
                   let responseString = String(data: data, encoding: .utf8) {
                    print("Server response:", responseString)

                    DispatchQueue.main.async {
                        self.parent.scannedCode = "Check-in successful"
                    }
                } else {
                    DispatchQueue.main.async {
                        self.parent.scannedCode = "No response from server"
                    }
                }
            }.resume()
        }
    }
}
