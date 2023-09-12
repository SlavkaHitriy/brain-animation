import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Brain } from "./Brain.tsx"

export const App = () => {
    return (
        <Canvas camera={{ position: [0, 0, 17.5] }}>
            <Brain />
            <OrbitControls />
        </Canvas>
    )
}
