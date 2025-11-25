/**
 * Math Visualizer Page
 * Tool for visualizing algebra functions and geometry (2D/3D)
 * Supports LaTeX rendering and interactive 3D geometry
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function MathVisualizerPage() {
  const [activeTab, setActiveTab] = useState('geometry')
  const [geoSideTab, setGeoSideTab] = useState('data')
  const [funcInput, setFuncInput] = useState('sin(x) * x')
  const [userFunc, setUserFunc] = useState(null)
  const [analysisResult, setAnalysisResult] = useState('Đang tính toán...')
  const [jsonInput, setJsonInput] = useState('')
  const [presetSelect, setPresetSelect] = useState('custom')
  const [probTitle, setProbTitle] = useState('Chưa có bài toán')
  const [probDesc, setProbDesc] = useState('...')
  const [probSolution, setProbSolution] = useState('')
  const [toggleRotate, setToggleRotate] = useState(false)
  const [toggleLabels, setToggleLabels] = useState(true)
  const [toggleGrid, setToggleGrid] = useState(false)
  const [currentMode, setCurrentMode] = useState('3d')

  // Canvas refs
  const graphCanvasRef = useRef(null)
  const threeContainerRef = useRef(null)
  const canvasContainerRef = useRef(null)

  // Three.js refs
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const shapeGroupRef = useRef(null)
  const labelGroupRef = useRef(null)
  const gridHelperRef = useRef(null)
  const pointsMapRef = useRef({})
  const animationFrameRef = useRef(null)

  // Graph state
  const graphStateRef = useRef({
    scale: 40,
    originX: 0,
    originY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
  })

  // Preset data
  const preset3D = {
    type: '3d',
    title: 'Tứ diện đều ABCD',
    description: 'Đoạn vuông góc chung MN của AB và CD.',
    camera: { position: [3, 2, 4], target: [0, 0, 0] },
    solution: {
      steps: [
        'Cho tứ diện đều ABCD cạnh $a$. Gọi M, N lần lượt là trung điểm của AB và CD.',
        'Xét $\\triangle ACD$ và $\\triangle BCD$ là hai tam giác đều cạnh $a$. Ta có trung tuyến $AN = BN = \\frac{a\\sqrt{3}}{2}$.',
        'Suy ra $\\triangle ABN$ cân tại N. Do đó trung tuyến NM cũng là đường cao: $MN \\perp AB$.',
        'Chứng minh tương tự, ta có $MN \\perp CD$.',
        'Vậy MN là đoạn vuông góc chung. Độ dài đoạn MN được tính bằng công thức: $$MN = \\sqrt{AN^2 - AM^2} = \\frac{a\\sqrt{2}}{2}$$',
      ],
    },
    geometry: {
      points: [
        { id: 'B', x: -1, y: -0.5, z: 1, label: 'B' },
        { id: 'C', x: 1, y: -0.5, z: 1, label: 'C' },
        { id: 'D', x: 0, y: -0.5, z: -1, label: 'D' },
        { id: 'A', x: 0, y: 1.5, z: 0, label: 'A' },
        { id: 'M', x: -0.5, y: 0.5, z: 0.5, label: 'M' },
        { id: 'N', x: 0.5, y: -0.5, z: 0, label: 'N' },
      ],
      segments: [
        { start: 'A', end: 'B', color: '#fff' },
        { start: 'A', end: 'C', color: '#fff' },
        { start: 'A', end: 'D', color: '#fff' },
        { start: 'B', end: 'C', color: '#fff' },
        { start: 'B', end: 'D', color: '#666', style: 'dashed' },
        { start: 'C', end: 'D', color: '#666', style: 'dashed' },
        { start: 'M', end: 'N', color: '#facc15', width: 2, label: 'MN' },
      ],
    },
  }

  const preset2D = {
    type: '2d',
    title: 'Hình học phẳng: Tiếp tuyến',
    description: 'Cho đường tròn (O; R) và điểm A ngoài đường tròn.',
    camera: { position: [0, 0, 10], target: [0, 0, 0], zoom: 50 },
    solution: {
      steps: [
        'Vẽ hai tiếp tuyến AB, AC đến đường tròn (O) với B, C là các tiếp điểm.',
        'Theo tính chất tiếp tuyến, ta có: $\\widehat{ABO} = \\widehat{ACO} = 90^\\circ$.',
        'Xét hai tam giác vuông $\\Delta ABO$ và $\\Delta ACO$ có cạnh huyền OA chung và $OB=OC=R$.',
        'Suy ra $\\Delta ABO = \\Delta ACO$ (cạnh huyền - cạnh góc vuông).',
        'Kết luận: $AB = AC$ và OA là tia phân giác của góc $\\widehat{BOC}$.',
      ],
    },
    geometry: {
      points: [
        { id: 'O', x: 0, y: 0, z: 0, label: 'O' },
        { id: 'A', x: -4, y: 0, z: 0, label: 'A' },
        { id: 'B', x: -1.5, y: 1.93, z: 0, label: 'B' },
        { id: 'C', x: -1.5, y: -1.93, z: 0, label: 'C' },
      ],
      circles: [{ center: 'O', radius: 2.5, color: '#60a5fa' }],
      segments: [
        { start: 'A', end: 'O', color: '#666', style: 'dashed' },
        { start: 'A', end: 'B', color: '#fff' },
        { start: 'A', end: 'C', color: '#fff' },
        { start: 'O', end: 'B', color: '#fff' },
        { start: 'O', end: 'C', color: '#fff' },
      ],
    },
  }

  const presets = { prob_3d: preset3D, prob_2d: preset2D }

  // Parse function
  const parseFunction = (str) => {
    try {
      return new Function(
        'x',
        'return ' +
          str
            .toLowerCase()
            .replace(/\^/g, '**')
            .replace(/sin|cos|tan|sqrt|abs/g, (m) => `Math.${m}`)
            .replace(/pi/g, 'Math.PI')
      )
    } catch (e) {
      return null
    }
  }

  // Update graph from input
  const updateGraphFromInput = () => {
    const func = parseFunction(funcInput)
    setUserFunc(() => func)
    if (!func) {
      setAnalysisResult('<span class="text-red-500">Lỗi cú pháp!</span>')
      return
    }
    setAnalysisResult(`f(0) = <b>${func(0).toFixed(2)}</b>`)
    drawGraph()
  }

  // Draw graph
  const drawGraph = () => {
    const canvas = graphCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { scale, originX, originY } = graphStateRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = originX % scale; x < canvas.width; x += scale) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
    }
    for (let y = originY % scale; y < canvas.height; y += scale) {
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
    }
    ctx.stroke()

    // Axes
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, originY)
    ctx.lineTo(canvas.width, originY)
    ctx.moveTo(originX, 0)
    ctx.lineTo(originX, canvas.height)
    ctx.stroke()

    // Function
    if (userFunc) {
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 2
      ctx.beginPath()
      let first = true
      for (let px = 0; px < canvas.width; px++) {
        let x = (px - originX) / scale
        try {
          let y = userFunc(x)
          if (!isFinite(y)) {
            first = true
            continue
          }
          let py = originY - y * scale
          if (first) {
            ctx.moveTo(px, py)
            first = false
          } else {
            ctx.lineTo(px, py)
          }
        } catch (e) {}
      }
      ctx.stroke()
    }
  }

  // Resize canvas
  const resizeCanvas = () => {
    const container = canvasContainerRef.current
    const canvas = graphCanvasRef.current
    if (!container || !canvas) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    graphStateRef.current.originX = canvas.width / 2
    graphStateRef.current.originY = canvas.height / 2
    drawGraph()
  }

  // Initialize 3D scene
  const init3D = () => {
    const container = threeContainerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(3, 3, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controlsRef.current = controls

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222)
    scene.add(gridHelper)
    gridHelperRef.current = gridHelper

    const shapeGroup = new THREE.Group()
    scene.add(shapeGroup)
    shapeGroupRef.current = shapeGroup

    const labelGroup = new THREE.Group()
    scene.add(labelGroup)
    labelGroupRef.current = labelGroup

    loadPreset('prob_3d')
    animate()
  }

  // Clear scene
  const clearScene = () => {
    if (!shapeGroupRef.current || !labelGroupRef.current) return
    while (shapeGroupRef.current.children.length > 0) {
      shapeGroupRef.current.remove(shapeGroupRef.current.children[0])
    }
    while (labelGroupRef.current.children.length > 0) {
      labelGroupRef.current.remove(labelGroupRef.current.children[0])
    }
    pointsMapRef.current = {}
  }

  // Update camera mode
  const updateCameraMode = (mode, config) => {
    const container = threeContainerRef.current
    if (!container) return

    const aspect = container.clientWidth / container.clientHeight
    setCurrentMode(mode)

    if (mode === '2d') {
      const fr = 5
      const camera = new THREE.OrthographicCamera(
        -fr * aspect,
        fr * aspect,
        fr,
        -fr,
        0.1,
        100
      )
      camera.position.set(0, 0, 10)
      camera.lookAt(0, 0, 0)
      cameraRef.current = camera
      controlsRef.current.object = camera
      controlsRef.current.enableRotate = false
      controlsRef.current.zoomSpeed = 1.2
      if (gridHelperRef.current) gridHelperRef.current.visible = false
    } else {
      const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
      if (config && config.position) {
        camera.position.set(...config.position)
      } else {
        camera.position.set(3, 3, 5)
      }
      cameraRef.current = camera
      controlsRef.current.object = camera
      controlsRef.current.enableRotate = true
      if (gridHelperRef.current)
        gridHelperRef.current.visible = toggleGrid
    }
  }

  // Render from JSON
  const renderFromJSON = (jsonData = null) => {
    clearScene()

    let data
    if (jsonData) {
      data = jsonData
    } else {
      try {
        data = JSON.parse(jsonInput)
      } catch (e) {
        alert('JSON Lỗi!')
        return
      }
    }

    setProbTitle(data.title || 'Bài toán')
    setProbDesc(data.description || '')

    // Render solution
    if (data.solution) {
      if (data.solution.sections) {
        setProbSolution(
          data.solution.sections
            .map(
              (sec, i) => `
            <div class="mb-4 bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
              <h5 class="text-blue-300 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-700 pb-2 flex items-center">
                <i class="fas fa-chevron-right text-[10px] mr-2 text-blue-500"></i> ${sec.title}
              </h5>
              <div class="text-gray-300 text-sm leading-relaxed math-content space-y-2">
                ${sec.content.split('\n').map((line) => `<p>${line}</p>`).join('')}
              </div>
            </div>
          `
            )
            .join('')
        )
      } else if (data.solution.steps) {
        setProbSolution(
          data.solution.steps
            .map(
              (s, i) => `
            <div class="flex gap-3 items-start p-2 bg-slate-800/30 rounded border border-slate-700/50 hover:border-blue-500/50 transition mb-2">
              <span class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-blue-900 text-blue-300 text-[10px] font-bold mt-0.5">${i + 1}</span>
              <div class="text-gray-300 text-sm leading-relaxed math-content">${s}</div>
            </div>
          `
            )
            .join('')
        )
      }

      // Trigger MathJax rendering
      if (window.MathJax) {
        setTimeout(() => {
          MathJax.typesetPromise([document.getElementById('probSolution')]).catch(
            (err) => console.log('MathJax Error:', err)
          )
        }, 100)
      }
    }

    if (!jsonData) {
      setGeoSideTab('sol')
    }

    const mode = data.type === '2d' || data.mode === '2d' ? '2d' : '3d'
    updateCameraMode(mode, data.camera)

    if (data.geometry) {
      const geo = data.geometry
      if (geo.points) {
        geo.points.forEach((p) => {
          pointsMapRef.current[p.id] = new THREE.Vector3(p.x, p.y, p.z || 0)
          if (p.visible !== false) {
            drawPoint({
              pos: pointsMapRef.current[p.id],
              color: '#ffffff',
              name: p.label,
            })
          }
        })
      }
      if (geo.circles) {
        geo.circles.forEach((c) => {
          const center =
            pointsMapRef.current[c.center] || new THREE.Vector3(0, 0, 0)
          drawCircle({ center: center, radius: c.radius, color: c.color })
        })
      }
      if (geo.segments) {
        geo.segments.forEach((s) => {
          const p1 = pointsMapRef.current[s.start]
          const p2 = pointsMapRef.current[s.end]
          if (p1 && p2) {
            drawLine({
              fromVec: p1,
              toVec: p2,
              color: s.color,
              width: s.width,
              dash: s.style === 'dashed',
            })
          }
        })
      }
      if (geo.polygons) {
        geo.polygons.forEach((poly) => {
          const verts = poly.vertices
            .map((id) => pointsMapRef.current[id])
            .filter((v) => v)
          if (verts.length >= 3) {
            drawSimplePolygon({ vertices: verts, color: poly.color })
          }
        })
      }
    }
  }

  // Draw point
  const drawPoint = (cfg) => {
    if (!shapeGroupRef.current) return
    const geo = new THREE.SphereGeometry(
      currentMode === '2d' ? 0.08 : 0.04,
      16,
      16
    )
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color || 0xffffff })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(cfg.pos)
    shapeGroupRef.current.add(mesh)
    if (cfg.name) createLabel(cfg.name, mesh.position)
  }

  // Draw line
  const drawLine = (cfg) => {
    if (!shapeGroupRef.current) return
    const p1 = cfg.fromVec
    const p2 = cfg.toVec
    const pts = [p1, p2]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    let mat
    if (cfg.dash) {
      mat = new THREE.LineDashedMaterial({
        color: cfg.color || 0x888888,
        dashSize: 0.2,
        gapSize: 0.1,
        linewidth: cfg.width || 1,
      })
      const line = new THREE.Line(geo, mat)
      line.computeLineDistances()
      shapeGroupRef.current.add(line)
    } else {
      mat = new THREE.LineBasicMaterial({
        color: cfg.color || 0xffffff,
        linewidth: cfg.width || 1,
      })
      shapeGroupRef.current.add(new THREE.Line(geo, mat))
    }
  }

  // Draw circle
  const drawCircle = (cfg) => {
    if (!shapeGroupRef.current) return
    const curve = new THREE.EllipseCurve(
      cfg.center.x,
      cfg.center.y,
      cfg.radius,
      cfg.radius,
      0,
      2 * Math.PI,
      false,
      0
    )
    const pts = curve.getPoints(64)
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: cfg.color || 0xffffff })
    const ellipse = new THREE.Line(geo, mat)
    shapeGroupRef.current.add(ellipse)
  }

  // Create label
  const createLabel = (text, pos) => {
    if (!labelGroupRef.current) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = 'bold 64px Arial'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 150, 75)
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
    const offset = currentMode === '2d' ? 0.3 : 0.1
    sprite.position.copy(pos).add(new THREE.Vector3(offset, offset, 0))
    sprite.scale.set(
      currentMode === '2d' ? 1.5 : 0.6,
      currentMode === '2d' ? 0.75 : 0.3,
      1
    )
    labelGroupRef.current.add(sprite)
  }

  // Draw simple polygon
  const drawSimplePolygon = (cfg) => {
    if (!shapeGroupRef.current) return
    const pts = cfg.vertices
    const indices = []
    for (let i = 1; i < pts.length - 1; i++) {
      indices.push(0, i, i + 1)
    }
    const geo = new THREE.BufferGeometry()
    const posArr = []
    pts.forEach((p) => posArr.push(p.x, p.y, p.z))
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const color = 0xff6347
    const opacity = 0.3
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      opacity: opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    shapeGroupRef.current.add(new THREE.Mesh(geo, mat))
  }

  // Load preset
  const loadPreset = (val = null) => {
    const presetValue = val || presetSelect
    if (presets[presetValue]) {
      setJsonInput(JSON.stringify(presets[presetValue], null, 2))
      renderFromJSON(presets[presetValue])
    } else {
      setJsonInput('')
      clearScene()
    }
  }

  // Toggle labels
  const handleToggleLabels = () => {
    if (labelGroupRef.current) {
      labelGroupRef.current.visible = !toggleLabels
    }
    setToggleLabels(!toggleLabels)
  }

  // Toggle grid
  const handleToggleGrid = () => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = !toggleGrid
    }
    setToggleGrid(!toggleGrid)
  }

  // Animate
  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return
    animationFrameRef.current = requestAnimationFrame(animate)
    if (controlsRef.current) controlsRef.current.update()
    if (toggleRotate && currentMode === '3d') {
      sceneRef.current.rotation.y += 0.002
    }
    rendererRef.current.render(sceneRef.current, cameraRef.current)
  }

  // Window resize
  const onWindowResize = () => {
    if (!rendererRef.current || !cameraRef.current) return
    const container = threeContainerRef.current
    if (!container) return
    const aspect = container.clientWidth / container.clientHeight
    if (currentMode === '2d') {
      const fr = 5
      cameraRef.current.left = -fr * aspect
      cameraRef.current.right = fr * aspect
      cameraRef.current.top = fr
      cameraRef.current.bottom = -fr
    } else {
      cameraRef.current.aspect = aspect
    }
    cameraRef.current.updateProjectionMatrix()
    rendererRef.current.setSize(container.clientWidth, container.clientHeight)
    if (activeTab === 'algebra') resizeCanvas()
  }

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e) => {
    graphStateRef.current.isDragging = true
    graphStateRef.current.startX = e.clientX
    graphStateRef.current.startY = e.clientY
  }

  const handleCanvasMouseMove = (e) => {
    if (!graphStateRef.current.isDragging) return
    const { startX, startY } = graphStateRef.current
    graphStateRef.current.originX += e.clientX - startX
    graphStateRef.current.originY += e.clientY - startY
    graphStateRef.current.startX = e.clientX
    graphStateRef.current.startY = e.clientY
    drawGraph()
  }

  const handleCanvasMouseUp = () => {
    graphStateRef.current.isDragging = false
  }

  // Effects
  useEffect(() => {
    if (activeTab === 'algebra') {
      resizeCanvas()
      updateGraphFromInput()
    } else {
      init3D()
    }
    window.addEventListener('resize', onWindowResize)
    return () => {
      window.removeEventListener('resize', onWindowResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'algebra' && graphCanvasRef.current) {
      resizeCanvas()
      drawGraph()
    }
  }, [userFunc, activeTab])

  useEffect(() => {
    if (presetSelect !== 'custom') {
      loadPreset()
    }
  }, [presetSelect])

  // Initialize MathJax
  useEffect(() => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true,
          packages: { '[+]': ['noerrors', 'noundefined'] },
        },
        options: {
          ignoreHtmlClass: 'tex2jax_ignore',
          processHtmlClass: 'tex2jax_process',
        },
        chtml: {
          scale: 1.1,
          displayAlign: 'left',
        },
      }
      const script = document.createElement('script')
      script.id = 'MathJax-script'
      script.async = true
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
      document.head.appendChild(script)
    }
  }, [])

  return (
    <div className="bg-gray-900 text-gray-200 font-sans h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-3 shadow-lg flex justify-between items-center z-20">
        <h1 className="text-lg font-bold flex items-center gap-2 text-white">
          <i className="fas fa-drafting-compass text-yellow-500"></i> Gemini Math Engine V3.2
        </h1>
        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
          <button
            onClick={() => setActiveTab('algebra')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition duration-200 ${
              activeTab === 'algebra'
                ? 'bg-blue-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Đại số
          </button>
          <button
            onClick={() => setActiveTab('geometry')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition duration-200 ${
              activeTab === 'geometry'
                ? 'bg-blue-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Hình học
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex overflow-hidden">
        {/* Algebra Panel */}
        {activeTab === 'algebra' && (
          <div className="absolute inset-0 flex flex-col md:flex-row w-full h-full bg-gray-50 text-gray-800">
            <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col p-4 shadow-lg z-10">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Nhập Hàm Số
              </h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={funcInput}
                  onChange={(e) => setFuncInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') updateGraphFromInput()
                  }}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-700"
                  placeholder="VD: x^2 - 2"
                />
                <button
                  onClick={updateGraphFromInput}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <i className="fas fa-arrow-right text-xs"></i>
                </button>
              </div>
              <div
                className="bg-blue-50 p-3 rounded border border-blue-100 text-sm"
                dangerouslySetInnerHTML={{ __html: analysisResult }}
              />
            </div>
            <div
              className="flex-1 relative cursor-crosshair bg-white"
              ref={canvasContainerRef}
            >
              <canvas
                ref={graphCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              ></canvas>
            </div>
          </div>
        )}

        {/* Geometry Panel */}
        {activeTab === 'geometry' && (
          <div className="absolute inset-0 flex flex-col md:flex-row w-full h-full">
            {/* Sidebar */}
            <div className="w-full md:w-96 bg-slate-900 border-r border-slate-700 flex flex-col z-10 shadow-2xl">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-700 bg-slate-800">
                <button
                  onClick={() => setGeoSideTab('data')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                    geoSideTab === 'data'
                      ? 'text-blue-400 border-blue-500 bg-slate-800/50 hover:bg-slate-800'
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <i className="fas fa-code mr-1"></i> Dữ liệu
                </button>
                <button
                  onClick={() => setGeoSideTab('sol')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                    geoSideTab === 'sol'
                      ? 'text-blue-400 border-blue-500 bg-slate-800/50 hover:bg-slate-800'
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <i className="fas fa-book-open mr-1"></i> Lời giải
                </button>
              </div>

              {/* Data Content */}
              {geoSideTab === 'data' && (
                <div className="flex-1 flex flex-col p-4 bg-slate-900">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Chọn Bài toán mẫu
                      </label>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          currentMode === '2d'
                            ? 'bg-blue-900 text-blue-300 border-blue-700'
                            : 'bg-green-900 text-green-300 border-green-700'
                        }`}
                      >
                        {currentMode === '2d' ? '2D MODE' : '3D MODE'}
                      </span>
                    </div>
                    <select
                      value={presetSelect}
                      onChange={(e) => {
                        setPresetSelect(e.target.value)
                        loadPreset(e.target.value)
                      }}
                      className="w-full text-sm p-2 border border-slate-600 rounded bg-black text-gray-300 focus:outline-none focus:border-blue-500 mb-2"
                    >
                      <option value="custom">-- Tùy chỉnh (Dán JSON) --</option>
                      <option value="prob_3d">Mẫu 3D: Tứ diện đều</option>
                      <option value="prob_2d">Mẫu 2D: Hình tròn & Tiếp tuyến</option>
                    </select>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Mã nguồn JSON
                    </label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="flex-1 w-full p-3 text-[11px] font-mono border border-slate-700 rounded bg-black text-green-400 focus:outline-none focus:border-blue-500 resize-none placeholder-gray-700 mb-3"
                      placeholder="Dán dữ liệu JSON từ Gemini vào đây..."
                    ></textarea>

                    <button
                      onClick={() => renderFromJSON()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded font-bold shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-play"></i> GIẢI BÀI TOÁN
                    </button>
                  </div>
                </div>
              )}

              {/* Solution Content */}
              {geoSideTab === 'sol' && (
                <div className="flex-1 flex flex-col p-0 bg-slate-900 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                    <h3 className="text-xl font-bold text-white mb-2 pb-2 border-b border-slate-700">
                      {probTitle}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6 italic bg-slate-800/50 p-3 rounded border border-slate-700">
                      {probDesc}
                    </p>

                    <div className="prose prose-invert prose-sm max-w-none">
                      <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                        CÁC BƯỚC GIẢI CHI TIẾT:
                      </h4>
                      <div
                        id="probSolution"
                        className="space-y-4"
                        dangerouslySetInnerHTML={{ __html: probSolution }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Viewport */}
            <div className="flex-1 relative bg-[#111] overflow-hidden" ref={threeContainerRef}>
              <div className="absolute top-4 left-4 pointer-events-none select-none z-10">
                <h4 className="font-light text-sm tracking-widest text-white/40 uppercase border-b border-white/10 pb-1">
                  Visualizer
                </h4>
              </div>

              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/80 backdrop-blur px-5 py-2 rounded-full border border-white/10 flex gap-6 text-xs text-white/80 z-10 shadow-xl">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
                  <input
                    type="checkbox"
                    checked={toggleRotate}
                    onChange={(e) => setToggleRotate(e.target.checked)}
                    className="accent-blue-500"
                  />{' '}
                  <span>Xoay</span>
                </label>
                <span className="w-px bg-white/10 h-4 self-center"></span>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
                  <input
                    type="checkbox"
                    checked={toggleLabels}
                    onChange={handleToggleLabels}
                    className="accent-blue-500"
                  />{' '}
                  <span>Nhãn</span>
                </label>
                <span className="w-px bg-white/10 h-4 self-center"></span>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
                  <input
                    type="checkbox"
                    checked={toggleGrid}
                    onChange={handleToggleGrid}
                    className="accent-blue-500"
                  />{' '}
                  <span>Lưới</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

