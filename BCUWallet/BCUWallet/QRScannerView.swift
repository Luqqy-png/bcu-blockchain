import SwiftUI
import AVFoundation

struct QRScannerView: UIViewControllerRepresentable {

    @Binding var scannedCode: String
    let studentEmail: String

    func makeUIViewController(context: Context) -> ScannerViewController {
        let vc = ScannerViewController()
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, ScannerDelegate {
        var parent: QRScannerView

        init(_ parent: QRScannerView) {
            self.parent = parent
        }

        func didFind(code: String) {
            parent.scannedCode = code
            sendToBackend(code: code)
        }

        func sendToBackend(code: String) {
            let backendBaseURL = "https://bcu-backend-production.up.railway.app/checkin"
            guard let url = URL(string: backendBaseURL) else { return }

            let body: [String: Any] = [
                "student_email": parent.studentEmail,
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
                    return
                }

                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                else {
                    DispatchQueue.main.async {
                        self.parent.scannedCode = "No response from server"
                    }
                    return
                }

                DispatchQueue.main.async {
                    if let msg = json["message"] as? String {
                        self.parent.scannedCode = msg
                    } else if let err = json["error"] as? String {
                        self.parent.scannedCode = err
                    } else {
                        self.parent.scannedCode = "Check-in processed"
                    }
                }
            }.resume()
        }
    }
}

