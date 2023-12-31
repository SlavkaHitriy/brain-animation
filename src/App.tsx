import { Canvas } from "@react-three/fiber"
import {OrbitControls} from "@react-three/drei"
import { Brain } from "./Brain.tsx"

export const App = () => {
    return (
        <Canvas camera={{ position: [0, 0, 20.5] }}>
            {/*<Stats />*/}
            <Brain />
            <OrbitControls />
        </Canvas>
    )
}
