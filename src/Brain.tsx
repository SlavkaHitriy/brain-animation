import { useEffect, useMemo, useRef } from 'react'
import {AdditiveBlending, BufferGeometry, Group, Vector3} from 'three'
import {useFrame, useThree} from '@react-three/fiber'
import {Sparkles, useGLTF} from "@react-three/drei";
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

interface ParticlesData {
    velocity: Vector3;
    numConnections: number;
    isBackgroundParticle?: boolean;
}

type GLTFResult = GLTF & {
    nodes: {
        Brain_Model: THREE.Mesh
    }
}

const PARTICLES_COUNT_COEF = 2

export const Brain = () => {
    const {nodes: {Brain_Model: brain}} = useGLTF('/brain.glb') as GLTFResult
    const groupRef = useRef<Group>(null)
    const particlesRef = useRef<BufferGeometry>(null)
    const linesGeometryRef = useRef<BufferGeometry>(null)

    const {viewport} = useThree()

    const maxBgParticleCount = 99
    const particleCount = brain.geometry.attributes.position.count / PARTICLES_COUNT_COEF
    const maxConnections = 10
    const minDistance = 1.7
    const maxDistance = 0.2
    let vertexpos = 0
    let colorpos = 0
    let numConnected = 0

    const segments = particleCount * particleCount
    const positions = useMemo(() => new Float32Array(segments * 3), [segments])
    const colors = useMemo(() => new Float32Array(segments * 3), [segments])

    const particlePositions = useMemo(() => new Float32Array(particleCount * 3), [])

    const particlesData = useMemo<ParticlesData[]>(() => [], [])

    const v = useMemo(() => new Vector3(), [])

    const boundingBox = new THREE.Box3().setFromObject(brain);
    const modelSize = boundingBox.getSize(new THREE.Vector3());
    const modelPosition = new THREE.Vector3();
    brain.getWorldPosition(modelPosition);
    const xBoundary = modelSize.x / 0.7;
    const yBoundary = modelSize.y / 0.7;
    const zBoundary = modelSize.z / 0.7;

    const generateParticles = (isBgParticles?: boolean) => {
        if (isBgParticles) {
            for (let i = 0; i < maxBgParticleCount; i++) {
                const pos = {
                    x: Math.random() * viewport.width - viewport.width / 2,
                    y: Math.random() * viewport.width - viewport.width / 2,
                    z: Math.random() * viewport.width - viewport.width / 2,
                }

                // if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z))
                //     continue

                particlePositions[i * 3] = pos.x
                particlePositions[i * 3 + 1] = pos.y
                particlePositions[i * 3 + 2] = pos.z

                const v = new Vector3(1 + Math.random() * 3, 1 + Math.random() * 3, 1 + Math.random() * 3)
                particlesData.push({ velocity: v.normalize().divideScalar(10), numConnections: 0, isBackgroundParticle: true })
            }
        } else {
            for (let i = 0; i < particleCount; i++) {
                const pos = {
                    x: brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF] * 15,
                    y: brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF + 1] * 15,
                    z: brain.geometry.attributes.position.array[i * 3 * PARTICLES_COUNT_COEF + 2] * 15,
                }

                // if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z))
                //     continue

                particlePositions[i * 3] = pos.x
                particlePositions[i * 3 + 1] = pos.y
                particlePositions[i * 3 + 2] = pos.z

                const v = new Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2)
                particlesData.push({ velocity: v.normalize().divideScalar(200), numConnections: 0 })
            }
        }
    }

    useEffect(() => {
        generateParticles()
        // generateParticles(true)

        if (particlesRef.current) {
            particlesRef.current.setDrawRange(0, particleCount + maxBgParticleCount)
        }
    }, [])

    useFrame(() => {
        // if (!corners.current) return;

        vertexpos = 0
        colorpos = 0
        numConnected = 0

        for (let i = 0; i < (particleCount + maxBgParticleCount); i++) {
            if (particlesData[i]?.numConnections) {
                particlesData[i].numConnections = 0
            }
        }

        for (let i = 0; i < (particleCount + maxBgParticleCount); i++) {
            if (!particlesData[i]) continue

            const particleData = particlesData[i]

            v.set(particlePositions[i * 3], particlePositions[i * 3 + 1], particlePositions[i * 3 + 2])
                .add(particleData.velocity)
                // .setLength(10)

            particlePositions[i * 3] = v.x
            particlePositions[i * 3 + 1] = v.y
            particlePositions[i * 3 + 2] = v.z


            if (!particleData.isBackgroundParticle) {
                if (
                    particlePositions[i * 3] + 0.5 < modelPosition.x - xBoundary ||
                    particlePositions[i * 3] - 0.5 > modelPosition.x + xBoundary
                ) {
                    particleData.velocity.x = -particleData.velocity.x
                }

                if (
                    particlePositions[i * 3 + 1] + 0.5 < modelPosition.y - yBoundary ||
                    particlePositions[i * 3 + 1] - 0.5 > modelPosition.y + yBoundary
                ) {
                    particleData.velocity.y = -particleData.velocity.y
                }

                if (
                    particlePositions[i * 3 + 2] + 0.5 < modelPosition.z - zBoundary ||
                    particlePositions[i * 3 + 2] - 0.5 > modelPosition.z + zBoundary
                ) {
                    particleData.velocity.z = -particleData.velocity.z
                }
            }

            if (particleData.numConnections >= maxConnections) continue

            for (let j = i + 1; j < (particleCount + maxBgParticleCount); j++) {
                if (!particlesData[j]) continue;
                const particleDataB = particlesData[j]
                if (particleDataB.numConnections >= maxConnections) continue

                const dx = particlePositions[i * 3] - particlePositions[j * 3]
                const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1]
                const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                if (dist < minDistance && dist > maxDistance) {
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
            <Sparkles count={100} scale={30} size={10} />
            <points>
                <bufferGeometry ref={particlesRef}>
                    <bufferAttribute attach="attributes-position" count={particleCount + maxBgParticleCount} array={particlePositions} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial color={'#bcbcbc'} size={2} blending={AdditiveBlending} transparent={true} sizeAttenuation={false} />
            </points>
            <lineSegments>
                <bufferGeometry ref={linesGeometryRef}>
                    <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
                </bufferGeometry>
                <lineBasicMaterial vertexColors={true} blending={AdditiveBlending} transparent={true} color={'#848484'} />
            </lineSegments>
        </group>
    )
}
