import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '../theme/colors';
import type { CourtZone, GameEvent } from '../types';

const COURT_WIDTH = 400;
const COURT_HEIGHT = 380;

export const COURT_ZONES: CourtZone[] = [
  // Paint / Restricted Area
  { id: 'paint', label: 'Paint', points: 'M140,0 L260,0 L260,190 L140,190 Z', shotValue: 2, centerX: 200, centerY: 95 },
  // Mid-range left
  { id: 'mid-left', label: 'Mid L', points: 'M40,0 L140,0 L140,190 L40,190 Z', shotValue: 2, centerX: 90, centerY: 95 },
  // Mid-range right
  { id: 'mid-right', label: 'Mid R', points: 'M260,0 L360,0 L360,190 L260,190 Z', shotValue: 2, centerX: 310, centerY: 95 },
  // Mid-range top left
  { id: 'mid-top-left', label: 'Mid TL', points: 'M40,190 L140,190 L140,260 L40,260 Z', shotValue: 2, centerX: 90, centerY: 225 },
  // Mid-range top right
  { id: 'mid-top-right', label: 'Mid TR', points: 'M260,190 L360,190 L360,260 L260,260 Z', shotValue: 2, centerX: 310, centerY: 225 },
  // Mid-range top center
  { id: 'mid-top', label: 'Mid T', points: 'M140,190 L260,190 L260,260 L140,260 Z', shotValue: 2, centerX: 200, centerY: 225 },
  // 3pt left corner
  { id: '3pt-left-corner', label: '3 LC', points: 'M0,0 L40,0 L40,190 L0,190 Z', shotValue: 3, centerX: 20, centerY: 95 },
  // 3pt right corner
  { id: '3pt-right-corner', label: '3 RC', points: 'M360,0 L400,0 L400,190 L360,190 Z', shotValue: 3, centerX: 380, centerY: 95 },
  // 3pt left wing
  { id: '3pt-left-wing', label: '3 LW', points: 'M0,190 L40,190 L40,330 L0,330 Z', shotValue: 3, centerX: 20, centerY: 260 },
  // 3pt right wing
  { id: '3pt-right-wing', label: '3 RW', points: 'M360,190 L400,190 L400,330 L360,330 Z', shotValue: 3, centerX: 380, centerY: 260 },
  // 3pt top
  { id: '3pt-top', label: '3 Top', points: 'M40,260 L140,260 L140,380 L260,380 L260,260 L360,260 L360,330 L400,330 L400,380 L0,380 L0,330 L40,330 Z', shotValue: 3, centerX: 200, centerY: 340 },
];

interface Props {
  shots?: GameEvent[];
  onZonePress?: (zone: CourtZone) => void;
  showLabels?: boolean;
  width?: number;
}

export default function CourtDiagram({ shots = [], onZonePress, showLabels = false, width: propWidth }: Props) {
  const screenWidth = propWidth || Dimensions.get('window').width - 32;
  const scale = screenWidth / COURT_WIDTH;
  const height = COURT_HEIGHT * scale;

  return (
    <View style={[styles.container, { width: screenWidth, height }]}>
      <Svg width={screenWidth} height={height} viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}>
        {/* Court background */}
        <Rect x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT} fill="#2d4a22" rx="4" />

        {/* Court lines */}
        <Rect x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT} fill="none" stroke="white" strokeWidth="2" rx="4" />

        {/* Baseline */}
        <Line x1="0" y1="1" x2={COURT_WIDTH} y2="1" stroke="white" strokeWidth="2" />

        {/* Paint */}
        <Rect x="140" y="0" width="120" height="190" fill="none" stroke="white" strokeWidth="1.5" />

        {/* Free throw circle */}
        <Circle cx="200" cy="190" r="60" fill="none" stroke="white" strokeWidth="1.5" />

        {/* Restricted arc */}
        <Path d="M 175 0 A 25 25 0 0 0 225 0" fill="none" stroke="white" strokeWidth="1.5" />

        {/* 3-point line */}
        <Path
          d="M 40 0 L 40 190 Q 40 320 200 330 Q 360 320 360 190 L 360 0"
          fill="none" stroke="white" strokeWidth="1.5"
        />

        {/* Half court line */}
        <Line x1="0" y1={COURT_HEIGHT} x2={COURT_WIDTH} y2={COURT_HEIGHT} stroke="white" strokeWidth="2" />

        {/* Tappable zones */}
        {COURT_ZONES.map((zone) => (
          <G key={zone.id}>
            <Path
              d={zone.points}
              fill="transparent"
              onPress={() => onZonePress?.(zone)}
            />
            {showLabels && (
              <SvgText
                x={zone.centerX}
                y={zone.centerY}
                fill="rgba(255,255,255,0.4)"
                fontSize="12"
                textAnchor="middle"
                fontWeight="bold"
              >
                {zone.label}
              </SvgText>
            )}
          </G>
        ))}

        {/* Shot indicators */}
        {shots.map((shot) => {
          if (shot.courtX == null || shot.courtY == null) return null;
          const x = (shot.courtX / 100) * COURT_WIDTH;
          const y = (shot.courtY / 100) * COURT_HEIGHT;
          const isMade = shot.shotResult === 'made' ||
            shot.eventType === '2pt_made' || shot.eventType === '3pt_made' || shot.eventType === 'ft_made';

          if (isMade) {
            return (
              <Circle
                key={shot.id}
                cx={x}
                cy={y}
                r="6"
                fill={Colors.shotMade}
                opacity={0.85}
              />
            );
          } else {
            return (
              <G key={shot.id}>
                <Line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} stroke={Colors.shotMissed} strokeWidth="2.5" />
                <Line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} stroke={Colors.shotMissed} strokeWidth="2.5" />
              </G>
            );
          }
        })}
      </Svg>

      {/* Overlay touchable areas for better hit targets */}
      {onZonePress && COURT_ZONES.map((zone) => {
        const bounds = getZoneBounds(zone);
        return (
          <TouchableOpacity
            key={`touch-${zone.id}`}
            style={[
              styles.touchZone,
              {
                left: bounds.x * scale,
                top: bounds.y * scale,
                width: bounds.width * scale,
                height: bounds.height * scale,
              },
            ]}
            onPress={() => onZonePress(zone)}
            activeOpacity={0.3}
          />
        );
      })}
    </View>
  );
}

function getZoneBounds(zone: CourtZone): { x: number; y: number; width: number; height: number } {
  // Parse simple rectangular bounds from the polygon points
  const coords = zone.points
    .replace(/[MLZ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(s => s.split(',').map(Number));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  touchZone: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
