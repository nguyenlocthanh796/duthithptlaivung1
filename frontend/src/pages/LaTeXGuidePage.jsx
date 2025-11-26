import { Link } from 'react-router-dom'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { RightSidebarContent } from '../components/RightSidebarContent'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { renderTextWithLatex } from '../utils/latexRenderer'

export function LaTeXGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState(null)

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const latexExamples = [
    {
      category: 'Căn bậc hai và căn bậc n',
      examples: [
        { code: '\\sqrt{x}', description: 'Căn bậc hai của x' },
        { code: '\\sqrt{25} = 5', description: 'Căn bậc hai của 25 bằng 5' },
        { code: '\\sqrt[n]{x}', description: 'Căn bậc n của x' },
        { code: '\\sqrt[3]{8} = 2', description: 'Căn bậc ba của 8 bằng 2' },
        { code: '\\sqrt{x^2 + y^2}', description: 'Căn bậc hai của biểu thức' },
        { code: '\\sqrt{a^2 + b^2 + c^2}', description: 'Căn bậc hai của tổng bình phương' },
        { code: '\\sqrt{\\frac{a}{b}}', description: 'Căn bậc hai của phân số' },
        { code: 'x = \\sqrt{b^2 - 4ac}', description: 'Công thức nghiệm phương trình bậc 2' },
      ]
    },
    {
      category: 'Phân số',
      examples: [
        { code: '\\frac{a}{b}', description: 'Phân số a/b' },
        { code: '\\frac{1}{2}', description: 'Một phần hai' },
        { code: '\\frac{x+1}{x-1}', description: 'Phân số với biểu thức' },
        { code: '\\frac{1}{2} + \\frac{1}{3}', description: 'Tổng các phân số' },
        { code: '\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}', description: 'Tổng các phân số với kết quả' },
        { code: '\\frac{a}{b} \\times \\frac{c}{d} = \\frac{ac}{bd}', description: 'Nhân hai phân số' },
        { code: '\\frac{x^2 + 2x + 1}{x^2 - 1}', description: 'Phân số với đa thức' },
        { code: '\\frac{d}{dx}\\left(\\frac{x^2}{2}\\right) = x', description: 'Đạo hàm của phân số' },
      ]
    },
    {
      category: 'Chỉ số trên và dưới',
      examples: [
        { code: 'x^2', description: 'x mũ 2' },
        { code: 'x^2 + y^2 = r^2', description: 'Phương trình đường tròn' },
        { code: 'x^{n+1}', description: 'x mũ (n+1)' },
        { code: 'a_1, a_2, a_n', description: 'Chỉ số dưới' },
        { code: 'a_1 + a_2 + ... + a_n', description: 'Tổng các số hạng' },
        { code: 'x^{2y}', description: 'Mũ phức tạp' },
        { code: 'x_i^2', description: 'Kết hợp chỉ số trên và dưới' },
        { code: 'e^{i\\pi} + 1 = 0', description: 'Công thức Euler (nổi tiếng)' },
        { code: 'a_{n+1} = a_n + d', description: 'Công thức truy hồi' },
      ]
    },
    {
      category: 'Tổng, tích, tích phân',
      examples: [
        { code: '\\sum_{i=1}^{n} x_i', description: 'Tổng từ i=1 đến n' },
        { code: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', description: 'Tổng các số tự nhiên' },
        { code: '\\sum_{k=0}^{\\infty} \\frac{1}{2^k} = 2', description: 'Tổng chuỗi vô hạn' },
        { code: '\\prod_{i=1}^{n} x_i', description: 'Tích từ i=1 đến n' },
        { code: '\\prod_{i=1}^{n} i = n!', description: 'Giai thừa' },
        { code: '\\int_{a}^{b} f(x) dx', description: 'Tích phân từ a đến b' },
        { code: '\\int_{0}^{1} x^2 dx = \\frac{1}{3}', description: 'Tích phân xác định' },
        { code: '\\int f(x) dx', description: 'Tích phân không xác định' },
        { code: '\\int x^2 dx = \\frac{x^3}{3} + C', description: 'Tích phân không xác định với hằng số' },
        { code: '\\int_{0}^{\\pi} \\sin(x) dx = 2', description: 'Tích phân lượng giác' },
      ]
    },
    {
      category: 'Ma trận và định thức',
      examples: [
        { code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', description: 'Ma trận 2x2' },
        { code: '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', description: 'Ma trận 2x2 với số cụ thể' },
        { code: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', description: 'Ma trận 3x3' },
        { code: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', description: 'Định thức 2x2' },
        { code: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc', description: 'Công thức tính định thức 2x2' },
        { code: '\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}', description: 'Ma trận với ngoặc vuông' },
        { code: '\\begin{pmatrix} x \\\\ y \\end{pmatrix}', description: 'Vectơ cột' },
      ]
    },
    {
      category: 'Hệ phương trình',
      examples: [
        { code: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', description: 'Hệ phương trình 2 ẩn' },
        { code: '\\begin{cases} 2x + 3y = 5 \\\\ x - y = 1 \\end{cases}', description: 'Hệ phương trình 2 ẩn với hệ số' },
        { code: '\\begin{cases} x + y + z = 6 \\\\ 2x - y + z = 3 \\\\ x + 2y - z = 2 \\end{cases}', description: 'Hệ phương trình 3 ẩn' },
        { code: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}', description: 'Hệ phương trình tổng quát' },
      ]
    },
    {
      category: 'Lượng giác',
      examples: [
        { code: '\\sin(x)', description: 'Sin của x' },
        { code: '\\sin(\\frac{\\pi}{2}) = 1', description: 'Sin của pi/2' },
        { code: '\\cos(x)', description: 'Cos của x' },
        { code: '\\cos(0) = 1', description: 'Cos của 0' },
        { code: '\\tan(x)', description: 'Tan của x' },
        { code: '\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}', description: 'Định nghĩa tan' },
        { code: '\\sin^2(x) + \\cos^2(x) = 1', description: 'Đồng nhất thức lượng giác cơ bản' },
        { code: '\\sin(a \\pm b) = \\sin(a)\\cos(b) \\pm \\cos(a)\\sin(b)', description: 'Công thức cộng sin' },
        { code: '\\cos(2x) = \\cos^2(x) - \\sin^2(x)', description: 'Công thức góc kép' },
      ]
    },
    {
      category: 'Logarit',
      examples: [
        { code: '\\log(x)', description: 'Logarit tự nhiên' },
        { code: '\\log_{10}(x)', description: 'Logarit cơ số 10' },
        { code: '\\log_{10}(100) = 2', description: 'Logarit cơ số 10 của 100' },
        { code: '\\ln(x)', description: 'Logarit tự nhiên (ln)' },
        { code: '\\ln(e) = 1', description: 'Logarit tự nhiên của e' },
        { code: '\\log_a(xy) = \\log_a(x) + \\log_a(y)', description: 'Tính chất logarit: log của tích' },
        { code: '\\log_a\\left(\\frac{x}{y}\\right) = \\log_a(x) - \\log_a(y)', description: 'Tính chất logarit: log của thương' },
        { code: '\\log_a(x^n) = n\\log_a(x)', description: 'Tính chất logarit: log của lũy thừa' },
      ]
    },
    {
      category: 'Ký hiệu toán học',
      examples: [
        { code: '\\alpha, \\beta, \\gamma', description: 'Chữ cái Hy Lạp: α, β, γ' },
        { code: '\\Delta, \\Omega, \\Sigma', description: 'Chữ cái Hy Lạp hoa: Δ, Ω, Σ' },
        { code: '\\leq, \\geq, \\neq', description: 'So sánh: ≤, ≥, ≠' },
        { code: 'x \\leq 5', description: 'x nhỏ hơn hoặc bằng 5' },
        { code: '\\pm, \\mp', description: 'Cộng trừ: ±, ∓' },
        { code: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', description: 'Công thức nghiệm phương trình bậc 2' },
        { code: '\\infty', description: 'Vô cực: ∞' },
        { code: '\\lim_{x \\to \\infty} f(x)', description: 'Giới hạn khi x tiến đến vô cực' },
        { code: '\\pi', description: 'Số pi: π' },
        { code: 'C = 2\\pi r', description: 'Chu vi hình tròn' },
        { code: '\\theta, \\phi', description: 'Góc: θ, φ' },
        { code: '\\approx, \\sim', description: 'Xấp xỉ, tương đương: ≈, ~' },
        { code: '\\cdot, \\times', description: 'Nhân: ·, ×' },
      ]
    },
    {
      category: 'Vectơ và ký hiệu',
      examples: [
        { code: '\\vec{a}', description: 'Vectơ a' },
        { code: '\\vec{a} + \\vec{b}', description: 'Tổng hai vectơ' },
        { code: '|\\vec{a}|', description: 'Độ dài vectơ a' },
        { code: '\\overrightarrow{AB}', description: 'Vectơ từ A đến B' },
        { code: '\\hat{a}', description: 'Vectơ đơn vị' },
        { code: '\\vec{a} \\cdot \\vec{b}', description: 'Tích vô hướng' },
        { code: '\\vec{a} \\times \\vec{b}', description: 'Tích có hướng' },
      ]
    },
    {
      category: 'Giới hạn và đạo hàm',
      examples: [
        { code: '\\lim_{x \\to 0} f(x)', description: 'Giới hạn khi x tiến đến 0' },
        { code: '\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1', description: 'Giới hạn đặc biệt' },
        { code: '\\lim_{x \\to \\infty} \\frac{1}{x} = 0', description: 'Giới hạn khi x tiến đến vô cực' },
        { code: "f'(x)", description: 'Đạo hàm bậc nhất' },
        { code: "\\frac{d}{dx}(x^2) = 2x", description: 'Đạo hàm của x^2' },
        { code: "f''(x)", description: 'Đạo hàm bậc hai' },
        { code: '\\frac{d}{dx} f(x)', description: 'Ký hiệu đạo hàm' },
        { code: '\\frac{d}{dx}\\left(\\frac{x^2}{2}\\right) = x', description: 'Đạo hàm của phân số' },
        { code: '\\frac{d^2}{dx^2} f(x)', description: 'Đạo hàm bậc hai (ký hiệu)' },
      ]
    },
    {
      category: 'Tập hợp',
      examples: [
        { code: '\\in, \\notin', description: 'Thuộc, không thuộc: ∈, ∉' },
        { code: 'x \\in \\mathbb{R}', description: 'x thuộc tập số thực' },
        { code: '\\subset, \\supset', description: 'Tập con, tập cha: ⊂, ⊃' },
        { code: '\\cup, \\cap', description: 'Hợp, giao: ∪, ∩' },
        { code: 'A \\cup B', description: 'Hợp của A và B' },
        { code: 'A \\cap B', description: 'Giao của A và B' },
        { code: '\\emptyset', description: 'Tập rỗng: ∅' },
        { code: '\\mathbb{R}, \\mathbb{N}, \\mathbb{Z}', description: 'Số thực, tự nhiên, nguyên: ℝ, ℕ, ℤ' },
        { code: '\\mathbb{Q}, \\mathbb{C}', description: 'Số hữu tỉ, phức: ℚ, ℂ' },
      ]
    },
  ]

  return (
    <ThreeColumnLayout rightSidebar={<RightSidebarContent />}>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Quay lại bảng tin</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hướng dẫn viết LaTeX</h1>
          <p className="text-gray-600">
            LaTeX là ngôn ngữ đánh dấu để soạn thảo công thức toán học. Dưới đây là các ví dụ phổ biến nhất.
          </p>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">💡 Mẹo nhanh:</h2>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Sử dụng dấu <code className="bg-white px-1 rounded">\</code> trước các lệnh LaTeX</li>
            <li>Dùng <code className="bg-white px-1 rounded">{}</code> để nhóm các biểu thức</li>
            <li>Dùng <code className="bg-white px-1 rounded">^</code> cho chỉ số trên và <code className="bg-white px-1 rounded">_</code> cho chỉ số dưới</li>
            <li>Dùng <code className="bg-white px-1 rounded">\\</code> để xuống dòng trong ma trận và hệ phương trình</li>
          </ul>
        </div>

        {/* Real-world Examples */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Ví dụ thực tế từ bài tập</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Bài toán: Giải phương trình bậc 2</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800 mb-2">
                {`ax^2 + bx + c = 0`}
              </code>
              <p className="text-xs text-gray-600 mb-2">Nghiệm:</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800">
                {`x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}`}
              </code>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Kết quả:</p>
                <div className="text-base text-gray-900">
                  {renderTextWithLatex('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}')}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Bài toán: Tính tích phân</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800 mb-2">
                {`\\int_{0}^{\\pi} \\sin(x) dx`}
              </code>
              <p className="text-xs text-gray-600 mb-2">Kết quả:</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800">
                {`\\int_{0}^{\\pi} \\sin(x) dx = 2`}
              </code>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Kết quả:</p>
                <div className="text-base text-gray-900">
                  {renderTextWithLatex('\\int_{0}^{\\pi} \\sin(x) dx = 2')}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Bài toán: Định lý Pythagoras</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800 mb-2">
                {`a^2 + b^2 = c^2`}
              </code>
              <p className="text-xs text-gray-600 mb-2">Trong tam giác vuông:</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800">
                {`c = \\sqrt{a^2 + b^2}`}
              </code>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Kết quả:</p>
                <div className="text-base text-gray-900">
                  {renderTextWithLatex('c = \\sqrt{a^2 + b^2}')}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Bài toán: Tổng chuỗi số</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800 mb-2">
                {`\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}`}
              </code>
              <p className="text-xs text-gray-600 mb-2">Ví dụ: Tổng từ 1 đến 100</p>
              <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800">
                {`\\sum_{i=1}^{100} i = 5050`}
              </code>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Kết quả:</p>
                <div className="text-base text-gray-900">
                  {renderTextWithLatex('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-8">
          {latexExamples.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{section.category}</h2>
              <div className="space-y-4">
                {section.examples.map((example, exampleIndex) => {
                  const uniqueIndex = `${sectionIndex}-${exampleIndex}`
                  return (
                    <div key={exampleIndex} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <code className="block bg-gray-50 px-3 py-2 rounded text-sm font-mono text-gray-800 mb-2">
                            {example.code}
                          </code>
                          <p className="text-sm text-gray-600">{example.description}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(example.code, uniqueIndex)}
                          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Sao chép"
                        >
                          {copiedIndex === uniqueIndex ? (
                            <Check size={18} className="text-green-600" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Kết quả:</p>
                        <div className="text-base text-gray-900">
                          {renderTextWithLatex(example.code)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
          <p>💡 <strong>Lưu ý:</strong> Bạn có thể sử dụng các công thức LaTeX này trong phần đăng bài hoặc bình luận.</p>
        </div>
      </div>
    </ThreeColumnLayout>
  )
}

