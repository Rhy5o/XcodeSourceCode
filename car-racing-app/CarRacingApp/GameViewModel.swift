import Foundation
import Combine

final class GameViewModel: ObservableObject {
    @Published var score: Int = 0
    @Published var bestScore: Int = UserDefaults.standard.integer(forKey: "bestScore")
    @Published var isGameOver: Bool = false
    @Published var isRunning: Bool = false

    func reset() {
        score = 0
        isGameOver = false
        isRunning = true
    }

    func gameOver() {
        isRunning = false
        isGameOver = true
        if score > bestScore {
            bestScore = score
            UserDefaults.standard.set(bestScore, forKey: "bestScore")
        }
    }
}
