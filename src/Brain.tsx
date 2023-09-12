import { useEffect, useMemo, useRef } from 'react'
import {AdditiveBlending, BufferGeometry, Group, Mesh, Vector3} from 'three'
import { useFrame } from '@react-three/fiber'
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

interface ParticlesData {
    velocity: Vector3;
    numConnections: number;
}

type GLTFResult = GLTF & {
    nodes: {
        Brain_Model: THREE.Mesh
    }
}

const PARTICLES_COUNT_COEF = 2

export const Brain = () => {
    const {nodes: {Brain_Model: brain}} = useGLTF('/brain.glb') as GLTFResult
    console.log(brain.geometry.attributes.position)
    const groupRef = useRef<Group>(null)
    const particlesRef = useRef<BufferGeometry>(null)
    const linesGeometryRef = useRef<BufferGeometry>(null)

    const maxParticleCount = brain.geometry.attributes.position.count / PARTICLES_COUNT_COEF
    const particleCount = brain.geometry.attributes.position.count / PARTICLES_COUNT_COEF
    const maxConnections = 10
    const minDistance = 1.2
    let vertexpos = 0
    let colorpos = 0
    let numConnected = 0

    const segments = maxParticleCount * maxParticleCount
    const positions = useMemo(() => new Float32Array(segments * 3), [segments])
    const colors = useMemo(() => new Float32Array(segments * 3), [segments])

    const particlePositions = useMemo(() => new Float32Array(maxParticleCount * 3), [])

    const particlesData = useMemo<ParticlesData[]>(() => [], [])

    const v = useMemo(() => new Vector3(), [])

    useEffect(() => {
        for (let i = 0; i < maxParticleCount; i++) {
            // const x = Math.random() * r - r / 2
            // const y = Math.random() * r - r / 2
            // const z = Math.random() * r - r / 2

            particlePositions[i * 3] = brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF] * 15
            particlePositions[i * 3 + 1] = brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF + 1] * 15
            particlePositions[i * 3 + 2] = brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF + 2] * 15

            const v = new Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2)
            particlesData.push({ velocity: v.normalize().divideScalar(100), numConnections: 0 })
        }

        if (particlesRef.current) {
            particlesRef.current.setDrawRange(0, particleCount)
        }
    }, [])

    useFrame(() => {
        // if (!corners.current) return;

        vertexpos = 0
        colorpos = 0
        numConnected = 0

        const boundingBox = new THREE.Box3().setFromObject(brain);
        const modelSize = boundingBox.getSize(new THREE.Vector3());
        const modelPosition = new THREE.Vector3();
        brain.getWorldPosition(modelPosition);
        const xBoundary = modelSize.x / 2;
        const yBoundary = modelSize.y / 2;
        const zBoundary = modelSize.z / 2;

        for (let i = 0; i < particleCount; i++) {
            if (particlesData[i]?.numConnections) {
                particlesData[i].numConnections = 0
            }
        }

        for (let i = 0; i < particleCount; i++) {
            if (!particlesData[i]) continue

            const particleData = particlesData[i]

            v.set(particlePositions[i * 3], particlePositions[i * 3 + 1], particlePositions[i * 3 + 2])
                .add(particleData.velocity)
                // .setLength(10)

            particlePositions[i * 3] = v.x
            particlePositions[i * 3 + 1] = v.y
            particlePositions[i * 3 + 2] = v.z

            if (
                particlePositions[i * 3] <= modelPosition.x - xBoundary ||
                particlePositions[i * 3] >= modelPosition.x + xBoundary
            ) {
                particleData.velocity.x = -particleData.velocity.x
            }

            if (
                particlePositions[i * 3 + 1] <= modelPosition.y - yBoundary ||
                particlePositions[i * 3 + 1] >= modelPosition.y + yBoundary
            ) {
                particleData.velocity.y = -particleData.velocity.y
            }

            if (
                particlePositions[i * 3 + 2] <= modelPosition.z - zBoundary ||
                particlePositions[i * 3 + 2] >= modelPosition.z + zBoundary
            ) {
                particleData.velocity.z = -particleData.velocity.z
            }


            // if (particlePositions[i * 3 + 1] < -rHalf || particlePositions[i * 3 + 1] > rHalf) particleData.velocity.y = -particleData.velocity.y
            //
            // if (particlePositions[i * 3] < -rHalf || particlePositions[i * 3] > rHalf) particleData.velocity.x = -particleData.velocity.x
            //
            // if (particlePositions[i * 3 + 2] < -rHalf || particlePositions[i * 3 + 2] > rHalf) particleData.velocity.z = -particleData.velocity.z

            if (particleData.numConnections >= maxConnections) continue

            for (let j = i + 1; j < particleCount; j++) {
                if (!particlesData[j]) continue;
                const particleDataB = particlesData[j]
                if (particleDataB.numConnections >= maxConnections) continue

                const dx = particlePositions[i * 3] - particlePositions[j * 3]
                const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1]
                const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (dist < minDistance) {
                    particleData.numConnections++
                    particleDataB.numConnections++

                    const alpha = 1.0 - dist / minDistance

                    positions[vertexpos++] = particlePositions[i * 3]
                    positions[vertexpos++] = particlePositions[i * 3 + 1]
                    positions[vertexpos++] = particlePositions[i * 3 + 2]

                    positions[vertexpos++] = particlePositions[j * 3]
                    positions[vertexpos++] = particlePositions[j * 3 + 1]
                    positions[vertexpos++] = particlePositions[j * 3 + 2]

                    colors[colorpos++] = alpha
                    colors[colorpos++] = alpha
                    colors[colorpos++] = alpha

                    colors[colorpos++] = alpha
                    colors[colorpos++] = alpha
                    colors[colorpos++] = alpha

                    numConnected++
                }
            }
        }

        if (linesGeometryRef.current && particlesRef.current && groupRef.current) {
            linesGeometryRef.current.setDrawRange(0, numConnected * 2)
            linesGeometryRef.current.attributes.position.needsUpdate = true
            linesGeometryRef.current.attributes.color.needsUpdate = true

            particlesRef.current.attributes.position.needsUpdate = true

            // groupRef.current.rotation.y += delta / 5
        }
    })

    return (
        <group ref={groupRef} dispose={null}>
            {/*<mesh ref={corners}>*/}
            {/*    <sphereGeometry args={[8]} />*/}
            {/*    <meshBasicMaterial />*/}
            {/*</mesh>*/}
            <points>
                <bufferGeometry ref={particlesRef}>
                    <bufferAttribute attach="attributes-position" count={particleCount} array={particlePositions} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial color={'white'} size={3} blending={AdditiveBlending} transparent={true} sizeAttenuation={false} />
            </points>
            <lineSegments>
                <bufferGeometry ref={linesGeometryRef}>
                    <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
                </bufferGeometry>
                <lineBasicMaterial vertexColors={true} blending={AdditiveBlending} transparent={true} />
            </lineSegments>
        </group>
    )
}
