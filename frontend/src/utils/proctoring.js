// Lazy load face-api.js to reduce initial bundle size and warnings
let faceapi = null
let modelsLoaded = false

const loadFaceAPI = async () => {
  if (!faceapi) {
    // Suppress console warnings during import
    const originalWarn = console.warn
    console.warn = () => {} // Temporarily suppress warnings
    
    try {
      faceapi = await import('face-api.js')
    } finally {
      console.warn = originalWarn // Restore warnings
    }
  }
  return faceapi
}

export const loadProctoringModels = async () => {
  if (modelsLoaded) return
  
  const faceapiModule = await loadFaceAPI()
  const MODEL_URL = '/models'
  
  await Promise.all([
    faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapiModule.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}

export const analyzeFrame = async (videoEl) => {
  if (!modelsLoaded) {
    await loadProctoringModels()
  }
  
  const faceapiModule = await loadFaceAPI()
  const detections = await faceapiModule.detectAllFaces(
    videoEl,
    new faceapiModule.TinyFaceDetectorOptions()
  )
  return detections
}
