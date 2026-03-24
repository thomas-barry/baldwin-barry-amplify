import Knob from '@/components/Knob';
import { useState } from 'react';
import styles from './KnobDemo.module.css';

const KnobDemo = () => {
  const [brightness, setBrightness] = useState(0);
  const lightOpacity = brightness / 100;

  return (
    <div className={styles.container}>
      <Knob
        value={brightness}
        onChange={val => setBrightness(Math.round(val))}
        minValue={0}
        maxValue={100}
        minMaxLabels={false}
        aria-label='Brightness'
      />

      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 200 320'
        width='200'
        height='320'>
        <defs>
          <radialGradient
            id='kd-glow-cone'
            cx='50%'
            cy='0%'
            r='100%'
            fx='50%'
            fy='0%'>
            <stop
              offset='0%'
              stopColor='#ffe08a'
              stopOpacity='0.55'
            />
            <stop
              offset='55%'
              stopColor='#ffbe3c'
              stopOpacity='0.18'
            />
            <stop
              offset='100%'
              stopColor='#ff9900'
              stopOpacity='0'
            />
          </radialGradient>
          <radialGradient
            id='kd-floor-pool'
            cx='50%'
            cy='50%'
            r='50%'>
            <stop
              offset='0%'
              stopColor='#ffe08a'
              stopOpacity='0.7'
            />
            <stop
              offset='40%'
              stopColor='#ffbe3c'
              stopOpacity='0.35'
            />
            <stop
              offset='100%'
              stopColor='#ff9900'
              stopOpacity='0'
            />
          </radialGradient>
          <radialGradient
            id='kd-bulb-glow'
            cx='50%'
            cy='50%'
            r='50%'>
            <stop
              offset='0%'
              stopColor='#fff9d6'
              stopOpacity='1'
            />
            <stop
              offset='40%'
              stopColor='#ffe08a'
              stopOpacity='0.8'
            />
            <stop
              offset='100%'
              stopColor='#ffbe3c'
              stopOpacity='0'
            />
          </radialGradient>
          <filter
            id='kd-soft-glow'
            x='-40%'
            y='-40%'
            width='180%'
            height='180%'>
            <feGaussianBlur
              stdDeviation='4'
              result='blur'
            />
            <feMerge>
              <feMergeNode in='blur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>

        {/* Floor */}
        <rect
          x='0'
          y='272'
          width='200'
          height='48'
          fill='#1a1612'
        />

        {/* Light elements — opacity driven by brightness */}
        <g opacity={lightOpacity}>
          <ellipse
            cx='88'
            cy='276'
            rx='70'
            ry='14'
            fill='url(#kd-floor-pool)'
          />
          <polygon
            points='68,118 108,118 148,272 28,272'
            fill='url(#kd-glow-cone)'
          />
          <ellipse
            cx='88'
            cy='112'
            rx='22'
            ry='10'
            fill='url(#kd-bulb-glow)'
            filter='url(#kd-soft-glow)'
          />
          <ellipse
            cx='88'
            cy='113'
            rx='6'
            ry='7'
            fill='#fff9d6'
          />
        </g>

        {/* Lamp structure */}
        <rect
          x='80'
          y='256'
          width='16'
          height='16'
          rx='3'
          fill='#3a3028'
        />
        <rect
          x='68'
          y='268'
          width='40'
          height='6'
          rx='3'
          fill='#2e261e'
        />
        <rect
          x='86'
          y='140'
          width='6'
          height='118'
          rx='3'
          fill='#3a3028'
        />
        <path
          d='M89,140 Q89,118 108,118'
          stroke='#3a3028'
          strokeWidth='6'
          fill='none'
          strokeLinecap='round'
        />
        <path
          d='M68,118 L108,118 L118,96 L58,96 Z'
          fill='#2e261e'
        />
        <path
          d='M72,116 L104,116 L112,100 L64,100 Z'
          fill='#3d3020'
        />
        <rect
          x='58'
          y='93'
          width='62'
          height='5'
          rx='2.5'
          fill='#4a3c28'
        />
      </svg>
    </div>
  );
};

export default KnobDemo;
