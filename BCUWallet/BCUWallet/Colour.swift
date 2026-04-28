import SwiftUI

struct Colour {
    static let bcuBg = Color(red: 5/255, green: 8/255, blue: 22/255)
    static let bcuBg2 = Color(red: 10/255, green: 16/255, blue: 32/255)
    static let bcuBg3 = Color(red: 11/255, green: 19/255, blue: 36/255)

    static let bcuText = Color.white
    static let bcuSubtext = Color(red: 203/255, green: 213/255, blue: 225/255)

    static let bcuCyan = Color(red: 34/255, green: 211/255, blue: 238/255)
    static let bcuCyanSoft = Color(red: 34/255, green: 211/255, blue: 238/255).opacity(0.12)

    static let bcuCard = Color.white.opacity(0.05)
    static let bcuBorder = Color.cyan.opacity(0.14)
}
