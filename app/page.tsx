"use client";
import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Brush, Eraser } from 'lucide-react'; 

const SWATCHES = [
  "#000000", "#ee3333", "#e64980", "#be4bdb",
  "#893200", "#228be6", "#3333ee", "#40c057", "#00aa00",
  "#fab005", "#fd7e14",
];

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [eraserActive, setEraserActive] = useState(false); // Track eraser state

  useEffect(() => {
    const canvas = canvasRef.current;
    const setCanvasSize = () => {
      if (canvas) {
        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        context?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      });
      if (latexExpression.length > 0) {
        setTimeout(() => {
          window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
        }, 0);
      }
    };
    return () => {
      document.head.removeChild(script);
    };
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = eraserActive ? '#FFFFFF' : color; // Set color or eraser color
        ctx.lineWidth = eraserActive ? eraserSize : brushSize; // Set size based on tool
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/calculate`,
          {
            image: canvas.toDataURL('image/png'),
            dict_of_vars: dictOfVars
          }
        );
        const resp = await response.data;
        console.log('Response', resp);
        if (resp.data && Array.isArray(resp.data)) {
          resp.data.forEach((data: Response) => {
            if (data.assign === true) {
              setDictOfVars({
                ...dictOfVars,
                [data.expr]: data.result
              });
            }
          });
          const ctx = canvas.getContext('2d');
          const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
          let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              if (imageData.data[i + 3] > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            }
          }
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          setLatexPosition({ x: centerX, y: centerY });
          resp.data.forEach((data: Response) => {
            setTimeout(() => {
              setResult({
                expression: data.expr,
                answer: data.result
              });
            }, 1000);
          });
        }
      }
    } catch (error) {
      console.error("Error running route:", error);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Header */}
      <motion.header
        className="bg-blue-900 text-white p-6 shadow-lg top-0 left-0 w-full z-30"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-4xl font-bold">Drawing & Calculation Tool</h1>
          <p className="text-lg mt-2 md:mt-0">Create drawings, perform calculations, and see results instantly!</p>
          {/* <ModeToggle/> */}
        </div>
      </motion.header>
      {/* Tools Section */}
      <motion.section
        id="tools-section"
        className="bg-white py-16"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="container mx-auto">
          <h2 className="text-3xl font-semibold mb-6 text-center">Tools</h2>
          <div className="flex flex-col md:flex-row justify-between items-start px-4">
            <div className="flex-1 mb-8 md:mb-0">
              <h3 className="text-xl font-semibold mb-4">Color Swatches</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {SWATCHES.map((swatch) => (
                  <ColorSwatch
                    key={swatch}
                    color={swatch}
                    onClick={() => {
                      setColor(swatch);
                      setEraserActive(false); 
                    }}
                    style={{ cursor: 'pointer', border: `2px solid ${color === swatch ? '#000' : '#fff'}` }}
                    className="rounded-full h-12 w-12 flex items-center justify-center"
                  >
                    <span className="opacity-0">{swatch}</span> {/* For accessibility */}
                  </ColorSwatch>
                ))}
              </div>
              <div className="flex items-center mt-4">
                <label className="mr-4">Brush Size:</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2">{brushSize}</span>
              </div>
              <div className="flex items-center mt-4">
                <label className="mr-4">Eraser Size:</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2">{eraserSize}</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-4">Tools</h3>
              <div className="flex flex-col">
                <Button onClick={() => setEraserActive(false)} className="mb-2">
                  <Brush className="mr-2" />
                  Brush
                </Button>
                <Button onClick={() => { setEraserActive(true); setColor('#FFFFFF'); }} className="mb-2">
                  <Eraser className="mr-2" />
                  Eraser
                </Button>
                <Button onClick={resetCanvas} className="mb-2 bg-red-500 hover:bg-red-700">
                  Reset Canvas
                </Button>
                <Button onClick={runRoute} className="bg-green-500 hover:bg-green-700">
                  Run
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      {/* Canvas Section */}
      <motion.section
        id="canvas-section"
        className="flex justify-center items-center py-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <canvas
          ref={canvasRef}
          className="border border-gray-400"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </motion.section>
      {/* Results Section */}
      <motion.section
        id="results-section"
        className="py-16 bg-gray-200"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="container mx-auto">
          <h2 className="text-3xl font-semibold mb-6 text-center">Results</h2>
          <div className="text-center">
            {result && (
              <div>
                <h3 className="text-xl font-semibold mb-2">{result.expression}</h3>
                <p className="text-lg">{result.answer}</p>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
