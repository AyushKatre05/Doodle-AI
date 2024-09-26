"use client";

import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Brush } from 'lucide-react'; 

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color; // Set color
        ctx.lineWidth = brushSize; // Set brush size
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
        const base64Image = canvas.toDataURL('image/png');

        const response = await axios.post<Response>('/api/calculate', {
          image: base64Image,
          variables: dictOfVars,
        });

        if (response.data.assign) {
          setDictOfVars((prevVars) => ({
            ...prevVars,
            [response.data.expr]: response.data.result,
          }));
        }

        const generatedResult: GeneratedResult = {
          expression: response.data.expr,
          answer: response.data.result,
        };

        setResult(generatedResult);
      }
    } catch (error) {
      console.error('Error during the run route:', error);
    }
  };

  const handleReset = () => {
    setReset(true);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black">
      <motion.div
        className="absolute top-0 left-0 w-full h-full opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Add any background animation or gradient here */}
      </motion.div>

      <canvas
        ref={canvasRef}
        className="z-10 border-2 border-gray-300 rounded-lg shadow-lg"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      <div className="z-20 mt-5 flex flex-col items-center">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Brush className="text-white" />
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-40"
          />
        </motion.div>

        <div className="mt-5">
        <ColorSwatch
            color={color}
            onChange={(newColor) => setColor(newColor)} // Ensure newColor is the expected value
            swatches={SWATCHES}
            fullWidth
            size="lg"
            style={{ width: '300px', justifyContent: 'space-between' }}
          />
        </div>

        <div className="mt-5 flex space-x-4">
          <Button onClick={runRoute} className="bg-green-500 text-white">
            Run
          </Button>
          <Button onClick={handleReset} className="bg-red-500 text-white">
            Reset
          </Button>
        </div>

        <div className="mt-5 text-white">
          {latexExpression.map((latex, index) => (
            <div
              key={index}
              style={{ position: 'absolute', top: latexPosition.y + index * 40, left: latexPosition.x }}
              dangerouslySetInnerHTML={{ __html: latex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
