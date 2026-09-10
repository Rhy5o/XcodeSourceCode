import SwiftUI
import SpriteKit

struct ContentView: View {
    @StateObject private var viewModel = GameViewModel()
    @State private var scene: GameScene = {
        let scene = GameScene(size: CGSize(width: 390, height: 844))
        scene.scaleMode = .resizeFill
        return scene
    }()

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                SpriteView(scene: scene)
                    .ignoresSafeArea()
                    .onAppear {
                        scene.size = proxy.size
                        scene.viewModel = viewModel
                        viewModel.reset()
                        scene.startRun()
                    }

                VStack {
                    HStack {
                        Text("Score: \(viewModel.score)")
                            .font(.headline)
                            .foregroundColor(.white)
                        Spacer()
                        Text("Best: \(viewModel.bestScore)")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                    .padding()
                    .background(.black.opacity(0.35))
                    .clipShape(Capsule())
                    .padding()

                    Spacer()

                    HStack(spacing: 40) {
                        controlButton(systemName: "arrow.left") {
                            scene.moveLeft()
                        }
                        controlButton(systemName: "arrow.right") {
                            scene.moveRight()
                        }
                    }
                    .padding(.bottom, 32)
                }

                if viewModel.isGameOver {
                    gameOverOverlay
                }
            }
        }
        .background(Color.black)
    }

    private var gameOverOverlay: some View {
        ZStack {
            Color.black.opacity(0.65).ignoresSafeArea()
            VStack(spacing: 16) {
                Text("Crashed!")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
                Text("Score: \(viewModel.score)")
                    .font(.title2)
                    .foregroundColor(.white)
                Button {
                    viewModel.reset()
                    scene.startRun()
                } label: {
                    Text("Race Again")
                        .font(.headline)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
            }
        }
    }

    private func controlButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.title.bold())
                .foregroundColor(.white)
                .frame(width: 60, height: 60)
                .background(.black.opacity(0.35))
                .clipShape(Circle())
        }
    }
}

#Preview {
    ContentView()
}
