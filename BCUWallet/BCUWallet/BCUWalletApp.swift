import SwiftUI

@main
struct BCUWalletApp: App {
    @StateObject private var store = StudentStore()

    var body: some Scene {
        WindowGroup {
            if store.isLoggedIn {
                TabView {
                    NavigationStack {
                        ContentView()
                    }
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }

                    NavigationStack {
                        ActivityView()
                    }
                    .tabItem {
                        Label("Activity", systemImage: "clock.fill")
                    }

                    NavigationStack {
                        LeaderboardView()
                    }
                    .tabItem {
                        Label("Leaderboard", systemImage: "list.number")
                    }
                }
                .tint(Colour.bcuCyan)
                .environmentObject(store)
            } else {
                AuthView()
                    .environmentObject(store)
            }
        }
    }
}

