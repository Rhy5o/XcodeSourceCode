# Car Racing App

A simple SwiftUI + SpriteKit lane-racing game for iOS.

## Gameplay

- Drive the blue car and dodge oncoming traffic across a 3-lane road.
- Tap the left/right half of the screen, or use the on-screen arrow buttons, to switch lanes.
- Score increases the longer you survive; traffic speeds up over time.
- Colliding with another car ends the run — tap **Race Again** to restart.

## Project structure

```
CarRacingApp.xcodeproj/       Xcode project
CarRacingApp/
  CarRacingAppApp.swift       App entry point (SwiftUI lifecycle)
  ContentView.swift           SwiftUI UI: SpriteView host, HUD, controls, game-over overlay
  GameScene.swift             SpriteKit scene: road, player/obstacle cars, physics, spawning
  GameViewModel.swift         Observable game state (score, best score, running/game-over)
  Assets.xcassets             App icon & accent color placeholders
  Preview Content/            SwiftUI preview assets
```

## Requirements

- Xcode 15+
- iOS 17+ deployment target

## Running

Open `CarRacingApp.xcodeproj` in Xcode and run the `CarRacingApp` scheme on a simulator or device.
