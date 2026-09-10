import SpriteKit

struct PhysicsCategory {
    static let player: UInt32 = 0x1 << 0
    static let obstacle: UInt32 = 0x1 << 1
    static let scoreZone: UInt32 = 0x1 << 2
}

final class GameScene: SKScene, SKPhysicsContactDelegate {

    weak var viewModel: GameViewModel?

    private let laneCount = 3
    private var laneXPositions: [CGFloat] = []
    private var roadInset: CGFloat = 24

    private var playerCar: SKShapeNode!
    private var currentLane = 1

    private var roadLines: [SKShapeNode] = []
    private var lastUpdateTime: TimeInterval = 0
    private var timeSinceLastSpawn: TimeInterval = 0
    private var spawnInterval: TimeInterval = 1.2
    private var obstacleSpeed: CGFloat = 260
    private var elapsedTime: TimeInterval = 0

    override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 0.16, green: 0.16, blue: 0.18, alpha: 1)
        physicsWorld.contactDelegate = self
        physicsWorld.gravity = .zero

        setUpLanes()
        setUpRoad()
        setUpPlayer()
        startRun()
    }

    func startRun() {
        removeAllChildren()
        roadLines.removeAll()
        setUpRoad()
        setUpPlayer()

        timeSinceLastSpawn = 0
        spawnInterval = 1.2
        obstacleSpeed = 260
        elapsedTime = 0
        lastUpdateTime = 0
        isPaused = false
    }

    private func setUpLanes() {
        laneXPositions = (0..<laneCount).map { i -> CGFloat in
            let usableWidth = size.width - roadInset * 2
            let laneWidth = usableWidth / CGFloat(laneCount)
            return roadInset + laneWidth * (CGFloat(i) + 0.5)
        }
        currentLane = laneCount / 2
    }

    private func setUpRoad() {
        let road = SKShapeNode(rectOf: CGSize(width: size.width - roadInset * 2, height: size.height))
        road.position = CGPoint(x: size.width / 2, y: size.height / 2)
        road.fillColor = SKColor(red: 0.24, green: 0.24, blue: 0.26, alpha: 1)
        road.strokeColor = .clear
        road.zPosition = -2
        road.name = "road"
        addChild(road)

        let dashHeight: CGFloat = 40
        let gap: CGFloat = 30
        var y: CGFloat = 0
        while y < size.height + dashHeight {
            for i in 1..<laneCount {
                let usableWidth = size.width - roadInset * 2
                let laneWidth = usableWidth / CGFloat(laneCount)
                let x = roadInset + laneWidth * CGFloat(i)
                let line = SKShapeNode(rectOf: CGSize(width: 4, height: dashHeight))
                line.position = CGPoint(x: x, y: y)
                line.fillColor = .white
                line.strokeColor = .clear
                line.alpha = 0.6
                line.zPosition = -1
                line.name = "roadLine"
                addChild(line)
                roadLines.append(line)
            }
            y += dashHeight + gap
        }
    }

    private func setUpPlayer() {
        let carSize = CGSize(width: 44, height: 78)
        playerCar = makeCarNode(size: carSize, color: SKColor(red: 0.2, green: 0.6, blue: 1.0, alpha: 1))
        playerCar.position = CGPoint(x: laneXPositions[currentLane], y: size.height * 0.18)
        playerCar.name = "player"
        playerCar.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: carSize.width * 0.8, height: carSize.height * 0.8))
        playerCar.physicsBody?.isDynamic = true
        playerCar.physicsBody?.affectedByGravity = false
        playerCar.physicsBody?.categoryBitMask = PhysicsCategory.player
        playerCar.physicsBody?.contactTestBitMask = PhysicsCategory.obstacle
        playerCar.physicsBody?.collisionBitMask = 0
        addChild(playerCar)
    }

    private func makeCarNode(size: CGSize, color: SKColor) -> SKShapeNode {
        let body = SKShapeNode(rectOf: size, cornerRadius: 10)
        body.fillColor = color
        body.strokeColor = SKColor.black.withAlphaComponent(0.4)
        body.lineWidth = 2
        body.zPosition = 5

        let windshield = SKShapeNode(rectOf: CGSize(width: size.width * 0.6, height: size.height * 0.28), cornerRadius: 4)
        windshield.fillColor = SKColor(white: 0.9, alpha: 0.85)
        windshield.strokeColor = .clear
        windshield.position = CGPoint(x: 0, y: size.height * 0.18)
        windshield.zPosition = 6
        body.addChild(windshield)

        return body
    }

    func moveLeft() {
        guard isRunning else { return }
        currentLane = max(0, currentLane - 1)
        movePlayer(toLane: currentLane)
    }

    func moveRight() {
        guard isRunning else { return }
        currentLane = min(laneCount - 1, currentLane + 1)
        movePlayer(toLane: currentLane)
    }

    private var isRunning: Bool { viewModel?.isRunning ?? false }

    private func movePlayer(toLane lane: Int) {
        let action = SKAction.moveTo(x: laneXPositions[lane], duration: 0.15)
        action.timingMode = .easeOut
        playerCar.run(action)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        if location.x < size.width / 2 {
            moveLeft()
        } else {
            moveRight()
        }
    }

    override func update(_ currentTime: TimeInterval) {
        guard isRunning else {
            lastUpdateTime = currentTime
            return
        }

        if lastUpdateTime == 0 {
            lastUpdateTime = currentTime
        }
        let dt = currentTime - lastUpdateTime
        lastUpdateTime = currentTime
        elapsedTime += dt

        scrollRoadLines(by: obstacleSpeed * CGFloat(dt))
        moveObstacles(by: obstacleSpeed * CGFloat(dt))

        timeSinceLastSpawn += dt
        if timeSinceLastSpawn >= spawnInterval {
            timeSinceLastSpawn = 0
            spawnObstacle()
        }

        obstacleSpeed = min(620, 260 + CGFloat(elapsedTime) * 6)
        spawnInterval = max(0.45, 1.2 - elapsedTime * 0.01)

        let newScore = Int(elapsedTime * 10)
        if newScore != viewModel?.score {
            viewModel?.score = newScore
        }
    }

    private func scrollRoadLines(by delta: CGFloat) {
        for line in roadLines {
            line.position.y -= delta
            if line.position.y < -40 {
                line.position.y += size.height + 70
            }
        }
    }

    private func moveObstacles(by delta: CGFloat) {
        for node in children where node.name == "obstacle" {
            node.position.y -= delta
            if node.position.y < -100 {
                node.removeFromParent()
            }
        }
    }

    private func spawnObstacle() {
        let lane = Int.random(in: 0..<laneCount)
        let carSize = CGSize(width: 44, height: 78)
        let colors: [SKColor] = [
            SKColor(red: 0.95, green: 0.3, blue: 0.3, alpha: 1),
            SKColor(red: 0.95, green: 0.7, blue: 0.2, alpha: 1),
            SKColor(red: 0.6, green: 0.4, blue: 0.9, alpha: 1)
        ]
        let obstacle = makeCarNode(size: carSize, color: colors.randomElement()!)
        obstacle.zRotation = .pi
        obstacle.name = "obstacle"
        obstacle.position = CGPoint(x: laneXPositions[lane], y: size.height + 80)
        obstacle.physicsBody = SKPhysicsBody(rectangleOf: CGSize(width: carSize.width * 0.8, height: carSize.height * 0.8))
        obstacle.physicsBody?.isDynamic = true
        obstacle.physicsBody?.affectedByGravity = false
        obstacle.physicsBody?.categoryBitMask = PhysicsCategory.obstacle
        obstacle.physicsBody?.contactTestBitMask = PhysicsCategory.player
        obstacle.physicsBody?.collisionBitMask = 0
        addChild(obstacle)
    }

    func didBegin(_ contact: SKPhysicsContact) {
        let mask = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask
        if mask == (PhysicsCategory.player | PhysicsCategory.obstacle) {
            handleCrash()
        }
    }

    private func handleCrash() {
        guard isRunning else { return }
        viewModel?.gameOver()
        playerCar.run(SKAction.sequence([
            SKAction.colorize(with: .red, colorBlendFactor: 0.6, duration: 0.1),
            SKAction.fadeAlpha(to: 0.4, duration: 0.2)
        ]))
    }
}
