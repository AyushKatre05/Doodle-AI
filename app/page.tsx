"use client";

import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

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
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const offsetX = e.type === 'mousedown' ? (e as React.MouseEvent).nativeEvent.offsetX : (e as React.TouchEvent).touches[0].clientX;
        const offsetY = e.type === 'mousedown' ? (e as React.MouseEvent).nativeEvent.offsetY : (e as React.TouchEvent).touches[0].clientY;

        ctx.strokeStyle = color; // Set color for brush
        ctx.lineWidth = brushSize; // Set brush size
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const offsetX = e.type === 'mousemove' ? (e as React.MouseEvent).nativeEvent.offsetX : (e as React.TouchEvent).touches[0].clientX;
        const offsetY = e.type === 'mousemove' ? (e as React.MouseEvent).nativeEvent.offsetY : (e as React.TouchEvent).touches[0].clientY;

        ctx.lineTo(offsetX, offsetY);
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
        </div>
      </motion.header>

      {/* Tools Section */}
      <motion.section
        id="tools-section"
        className="bg-white py-16"
                initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto flex flex-col items-center">
          <div className="flex space-x-4 mb-8">
            {/* Color Swatches */}
            {SWATCHES.map((swatch) => (
              <ColorSwatch
                key={swatch}
                color={swatch}
                onClick={() => setColor(swatch)}
                className="cursor-pointer transition-transform transform hover:scale-105"
              />
            ))}
            {/* Brush Size Slider */}
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="slider"
            />
            <span>Brush Size: {brushSize}</span>
          </div>

          {/* Canvas for Drawing */}
          <canvas
            ref={canvasRef}
            className="border border-gray-400"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="mt-4">
            <Button onClick={runRoute} className="bg-green-500 text-white hover:bg-green-600">
              Run Calculation
            </Button>
            <Button onClick={() => setReset(true)} className="bg-red-500 text-white hover:bg-red-600 ml-2">
              Reset Canvas
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Results Section */}
      {result && (
        <motion.section
          className="mt-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto">
            <h2 className="text-2xl font-semibold text-center">Calculation Result</h2>
            <div className="text-center mt-4">
              <h3 className="text-xl">Expression: {result.expression}</h3>
              <h3 className="text-xl">Answer: {result.answer}</h3>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}
