'use client';

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

const socket = io('http://localhost:5005');

export default function Home() {
  const [frame, setFrame] = useState('');
  const [heatmap, setHeatmap] = useState('');
  const [gps, setGps] = useState({ latitude: 24.7136, longitude: 46.6753 });
  const [altitude, setAltitude] = useState(500);
  const [city, setCity] = useState('Riyadh');
  const [temperature, setTemperature] = useState(30);
  const [time, setTime] = useState('');
  const [altitudeHistory, setAltitudeHistory] = useState([]);
  const [detections, setDetections] = useState([]);
  const [sos, setSos] = useState(false);

  const alarmRef = useRef(null);

  useEffect(() => {
    socket.on('detections', (data) => {
      setFrame(data.annotated_image);
      setHeatmap(data.heatmap_image);
      setGps(data.gps);
      setDetections(data.detections);

      const foundHuman = data.detections.some(det => 
        det.classes.includes(0)
      );
      setSos(foundHuman);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (alarmRef.current) {
      if (sos) {
        alarmRef.current.play();
      } else {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }
    }
  }, [sos]);

  useEffect(() => {
    const altitudeInterval = setInterval(() => {
      const randomAltitude = Math.floor(Math.random() * 1000);
      setAltitude(randomAltitude);
      setAltitudeHistory(prev => [...prev.slice(-9), randomAltitude]);
    }, 3000);

    return () => clearInterval(altitudeInterval);
  }, []);

  useEffect(() => {
    setTime(new Date().toLocaleString());

    const temperatureInterval = setInterval(() => {
      const randomTemp = Math.floor(Math.random() * 21) + 20;
      setTemperature(randomTemp);
      setTime(new Date().toLocaleString());
    }, 600000);

    return () => clearInterval(temperatureInterval);
  }, []);

  const altitudeChartData = {
    labels: altitudeHistory.map((_, i) => `${i * 3}s`),
    datasets: [
      {
        label: 'Altitude (m)',
        data: altitudeHistory,
        fill: false,
        borderColor: 'rgb(34, 197, 94)',
        tension: 0.4,
      },
    ],
  };

  const altitudeChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 1000,
        grid: {
          color: 'rgba(255,255,255,0.1)'
        },
        ticks: {
          color: '#d1d5db'
        }
      },
      x: {
        grid: {
          color: 'rgba(255,255,255,0.1)'
        },
        ticks: {
          color: '#d1d5db'
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-[#0d1117] text-gray-200 p-4 md:p-6 gap-4 md:gap-6">
      
      {/* صوت التنبيه */}
      <audio ref={alarmRef} src="/alarm.mp3" preload="auto" loop />

      {/* القسم الأيسر - Heatmap + SOS */}
      <section className="flex flex-col bg-[#161b22] p-4 md:p-6 rounded-2xl shadow-lg w-full md:w-1/4 gap-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-gray-100">🗺️ Heatmap</h2>
        {heatmap ? (
          <img
            src={heatmap}
            alt="Detection Heatmap"
            className="rounded-lg w-full h-[300px] object-contain border"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-[300px] bg-gray-700 rounded-xl">
            <p className="text-gray-400">No Heatmap</p>
          </div>
        )}

        {/* كرت SOS */}
        <div className={`flex flex-col items-center justify-center p-6 rounded-xl ${sos ? 'bg-red-500 text-white' : 'bg-green-600 text-white'} shadow-inner`}>
          <h3 className="text-lg md:text-xl font-bold mb-2">🚨 SOS Alert</h3>
          <p className="text-base md:text-lg">{sos ? 'Human Detected!' : 'Safe'}</p>
        </div>
      </section>

      {/* القسم الأوسط - Live Feed */}
      <section className="flex flex-col items-center justify-center bg-[#161b22] p-4 md:p-6 rounded-2xl shadow-lg w-full md:w-2/4">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-100">🚁 Live Drone Feed</h1>
        {frame ? (
          <img
            src={frame}
            alt="Live Drone"
            className="rounded-xl w-full h-[500px] object-contain border"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-[500px] bg-gray-700 rounded-xl">
            <p className="text-lg text-gray-400">No live feed yet</p>
          </div>
        )}
      </section>

      {/* القسم الأيمن - Telemetry */}
      <section className="flex flex-col bg-[#161b22] p-4 md:p-6 rounded-2xl shadow-lg w-full md:w-1/4">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-100">📊 Telemetry</h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Latitude', value: gps.latitude.toFixed(6) },
            { label: 'Longitude', value: gps.longitude.toFixed(6) },
            { label: 'Altitude', value: `${altitude} m` },
            { label: 'City', value: city },
            { label: 'Temperature', value: `${temperature}°C` },
            { label: 'Time', value: time },
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center justify-center bg-[#21262d] p-4 rounded-xl shadow-inner">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="text-base md:text-lg font-semibold text-white text-center">{item.value}</p>
            </div>
          ))}
        </div>

        {/* رسم بياني */}
        <div className="bg-[#21262d] p-4 rounded-xl shadow-inner">
          <h3 className="text-md font-semibold mb-2 text-gray-300 text-center">Altitude Trend</h3>
          <Line data={altitudeChartData} options={altitudeChartOptions} height={150} />
        </div>
      </section>
    </main>
  );
}
