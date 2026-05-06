import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Group, Text, Path } from 'react-konva';
import { Html } from 'react-konva-utils';
import useImage from 'use-image';
import { useAppContext, CanvasItem } from '../store';

const CanvasNode = ({ item, isSelected, onSelect, onChange, onRemove }: { item: CanvasItem, isSelected: boolean, onSelect: () => void, onChange: (newAttrs: any) => void, onRemove: () => void }) => {
    const [img] = useImage(item.src || '');
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && !item.isGenerating && trRef.current && groupRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected, item.isGenerating]);

    // Border and shadow styling for "Light Theme Premium" look
    const PADDING = 8;
    const nodeWidth = item.width + PADDING * 2;
    const nodeHeight = item.height + PADDING * 2 + 24; // 24px for top bar

    return (
        <React.Fragment>
            <Group
                onClick={onSelect}
                onTap={onSelect}
                ref={groupRef}
                x={item.x}
                y={item.y}
                draggable={!item.isGenerating}
                onDragEnd={(e) => {
                    onChange({
                        ...item,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    // transformer is changing scale of the node
                    // and then we should reset it back and update width/height on store.
                    const node = groupRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    // Update padding logic
                    // We know width was item.width and total was item.width + PADDING*2
                    const newWidth = Math.max(50, item.width * scaleX);
                    const newHeight = Math.max(50, item.height * scaleY);

                    onChange({
                        ...item,
                        x: node.x(),
                        y: node.y(),
                        width: newWidth,
                        height: newHeight,
                    });
                }}
            >
                {/* Node Background */}
                <Rect
                    width={nodeWidth}
                    height={nodeHeight}
                    fill="#ffffff"
                    cornerRadius={8}
                    shadowColor="rgba(0,0,0,0.08)"
                    shadowBlur={16}
                    shadowOffset={{ x: 0, y: 4 }}
                    stroke={isSelected ? '#3B82F6' : '#E5E7EB'}
                    strokeWidth={isSelected ? 2 : 1}
                />
                
                {/* Top bar title */}
                <Text 
                    x={PADDING} 
                    y={PADDING} 
                    text={item.isGenerating ? "正在生成..." : "生成结果"}
                    fontSize={10}
                    fill={item.isGenerating ? "#3B82F6" : "#6B7280"}
                    fontFamily="Inter, sans-serif"
                />

                {/* The Image itself */}
                {item.isGenerating ? (
                    <Group x={PADDING} y={PADDING + 20}>
                        <Rect
                            width={item.width}
                            height={item.height}
                            fill="#F3F4F6"
                            cornerRadius={4}
                        />
                        <Text
                            width={item.width}
                            height={item.height}
                            text="正在生成..."
                            fontSize={14}
                            fill="#9CA3AF"
                            align="center"
                            verticalAlign="middle"
                            fontFamily="Inter, sans-serif"
                        />
                    </Group>
                ) : (
                    img && (
                        <KonvaImage
                            x={PADDING}
                            y={PADDING + 20}
                            image={img}
                            width={item.width}
                            height={item.height}
                            cornerRadius={4}
                        />
                    )
                )}

                {/* Overlay UI for selected node */}
                {isSelected && !item.isGenerating && (
                    <Html
                        divProps={{
                            style: {
                                position: 'absolute',
                                top: `${nodeHeight + 8}px`,
                                left: '0px',
                                width: `${nodeWidth}px`
                            },
                        }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.src) {
                                        const link = document.createElement('a');
                                        link.download = `artwork_${item.id}.png`;
                                        link.href = item.src;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-medium rounded-md shadow-sm hover:bg-blue-700 transition"
                            >
                                保存图片
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="px-3 py-1.5 bg-white text-red-500 border border-red-200 text-[10px] font-medium rounded-md shadow-sm hover:bg-red-50 transition"
                            >
                                删除节点
                            </button>
                        </div>
                    </Html>
                )}
            </Group>

            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 50 || newBox.height < 50) return oldBox;
                        return newBox;
                    }}
                />
            )}
        </React.Fragment>
    );
};

export const CanvasArea = () => {
    const { items, updateItem, removeItem, selectedId, setSelectedId } = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const stageRef = useRef<any>(null);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const handleStageMouseDown = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedId(null);
        }
    };

    // Calculate lines between nodes
    const renderConnections = () => {
        return items.filter(i => i.parentId).map(item => {
            const parent = items.find(i => i.id === item.parentId);
            if (!parent) return null;

            // Simple center to center line, or right to left
            const startX = parent.x + parent.width + 16; 
            const startY = parent.y + (parent.height) / 2 + 16;
            const endX = item.x;
            const endY = item.y + (item.height) / 2 + 16;

            const curveValue = Math.abs(endX - startX) / 2;
            const pathData = `M${startX},${startY} C${startX + curveValue},${startY} ${endX - curveValue},${endY} ${endX},${endY}`;

            return (
                <Path 
                    key={`line-${item.id}`}
                    data={pathData}
                    stroke="#D1D5DB"
                    strokeWidth={2}
                    dash={[5, 5]}
                />
            );
        });
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        
        const scaleBy = 1.1;
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = stage.scaleX();

        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const mousePointTo = {
            x: (pointerPosition.x - stage.x()) / oldScale,
            y: (pointerPosition.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        
        // Limit zoom
        if (newScale < 0.1 || newScale > 10) return;

        stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: pointerPosition.x - mousePointTo.x * newScale,
            y: pointerPosition.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
    };

    return (
        <div ref={containerRef} className="flex-1 relative bg-[#F9FAFB] overflow-hidden">
            {/* Grid Background - Light Theme */}
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#E5E7EB 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
            
            {/* Empty State */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {items.length === 0 && (
                    <div className="relative text-center">
                        <div className="w-[560px] h-[315px] border border-gray-200 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                             <div className="text-gray-400 text-sm font-medium tracking-wide">请在左侧选择模型或上传图片以开始作图</div>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 text-gray-500">
                            <div className="text-xs tracking-wider">🖱️ 拖拽空白处可无限平移画布</div>
                        </div>
                    </div>
                )}
            </div>

            <Stage
                style={{ position: 'absolute', inset: 0 }}
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                onMouseDown={handleStageMouseDown}
                onTouchStart={handleStageMouseDown}
                onWheel={handleWheel}
                draggable
            >
                <Layer>
                    {renderConnections()}
                    {items.map((item, i) => {
                        if (item.type === 'image') {
                            return (
                                <CanvasNode
                                    key={item.id}
                                    item={item}
                                    isSelected={item.id === selectedId}
                                    onSelect={() => setSelectedId(item.id)}
                                    onChange={(newAttrs) => updateItem(item.id, newAttrs)}
                                    onRemove={() => removeItem(item.id)}
                                />
                            )
                        }
                        return null;
                    })}
                </Layer>
            </Stage>
            
            {/* Floating Toolbar */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-3 bg-white/90 backdrop-blur-xl p-2 rounded-2xl border border-gray-200 shadow-xl">
                <div onClick={() => setSelectedId(null)} className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg text-blue-600 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors" title="取消选中">✕</div>
            </div>
        </div>
    );
};
