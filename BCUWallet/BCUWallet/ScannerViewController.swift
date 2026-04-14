// wraps AVCaptureSession to handle the actual camera + QR code reading
// UIKit is needed here because SwiftUI doesn't have its own camera view yet
// the delegate pattern passes the scanned code back up to QRScannerView

import UIKit
import AVFoundation

// delegate the scanner view uses to report a successful scan
protocol ScannerDelegate: AnyObject {
    func didFind(code: String)
}

class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {

    weak var delegate: ScannerDelegate?

    var captureSession: AVCaptureSession!
    var previewLayer: AVCaptureVideoPreviewLayer!

    override func viewDidLoad() {
        super.viewDidLoad()

        print("Scanner screen loaded")
        view.backgroundColor = .black

        // the simulator has no camera so I fire a fake token after 2 seconds instead
        // makes it easier to test the check-in flow without needing a real device
#if targetEnvironment(simulator)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            print("FAKE SCAN TRIGGERED")
            self.delegate?.didFind(code: "18e3ef52cf724e743effa297016d5679")
        }
        return
#endif

        // real device path — set up the capture session
        captureSession = AVCaptureSession()

        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else {
            print("No camera device found")
            return
        }

        let videoInput: AVCaptureDeviceInput

        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            print("Camera input error:", error.localizedDescription)
            return
        }

        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        } else {
            print("Cannot add video input")
            return
        }

        // metadata output is what actually reads the QR code content
        let metadataOutput = AVCaptureMetadataOutput()

        if captureSession.canAddOutput(metadataOutput) {
            captureSession.addOutput(metadataOutput)
            // run the delegate on the main queue so UI updates are safe
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
        } else {
            print("Cannot add metadata output")
            return
        }

        // layer that shows the live camera feed behind the scan UI
        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer.frame = view.layer.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)

        captureSession.startRunning()
        print("Capture session started")
    }

    // called by AVFoundation every time it reads a QR code from the camera feed
    // we grab the first readable object, stop scanning so it doesn't fire repeatedly,
    // and pass the string value back up to the SwiftUI coordinator via the delegate
    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        captureSession.stopRunning()

        guard
            let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
            let code = object.stringValue
        else { return }

        print("QR code read:", code)
        delegate?.didFind(code: code)
    }
}
