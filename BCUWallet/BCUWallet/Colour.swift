// shared colour palette so I only define the brand colours once
// matching the same dark navy / cyan theme as the web app for visual consistency

import SwiftUI

struct Colour {
    // background gradient layers — from darkest to slightly lighter
    static let bcuBg  = Color(red: 5/255,  green: 8/255,  blue: 22/255)
    static let bcuBg2 = Color(red: 10/255, green: 16/255, blue: 32/255)
    static let bcuBg3 = Color(red: 11/255, green: 19/255, blue: 36/255)

    // text colours
    static let bcuText    = Color.white
    static let bcuSubtext = Color(red: 203/255, green: 213/255, blue: 225/255)

    // cyan accent — used for buttons and highlights
    static let bcuCyan     = Color(red: 34/255, green: 211/255, blue: 238/255)
    static let bcuCyanSoft = Color(red: 34/255, green: 211/255, blue: 238/255).opacity(0.12)

    // card and border styles — subtle so the content stands out
    static let bcuCard   = Color.white.opacity(0.05)
    static let bcuBorder = Color.cyan.opacity(0.14)
}
