import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
}

interface Connection {
  node1: Node;
  node2: Node;
  opacity: number;
  distance: number;
}

@Component({
  selector: 'app-animated-background',
  standalone: true,
  template: `
    <canvas 
      #canvas 
      class="animated-background-canvas"
      [width]="canvasWidth"
      [height]="canvasHeight">
    </canvas>
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      display: block;
    }
    
    .animated-background-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%);
    }
  `]
})
export class AnimatedBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D | null;
  private animationId: number = 0;
  private nodes: Node[] = [];
  private connections: Connection[] = [];
  private mouseX = 0;
  private mouseY = 0;
  private isMouseActive = false;
  private isInitialized = false;
  
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  
  private readonly NODE_COUNT = 80;
  private readonly MAX_CONNECTION_DISTANCE = 150;
  private readonly MOUSE_INFLUENCE_RADIUS = 200;
  private readonly NODE_SPEED = 0.3;

  ngAfterViewInit() {
    console.log('AnimatedBackground: ngAfterViewInit called');
    
    // Try multiple times to initialize
    this.tryInitialize();
  }

  private tryInitialize(attempts = 0) {
    if (attempts > 5) {
      console.error('AnimatedBackground: Failed to initialize after 5 attempts');
      return;
    }

    setTimeout(() => {
      const canvas = this.canvasRef?.nativeElement;
      
      if (!canvas) {
        console.error('AnimatedBackground: Canvas element not found');
        this.tryInitialize(attempts + 1);
        return;
      }

      console.log('AnimatedBackground: Canvas element found', canvas);
      console.log('AnimatedBackground: Canvas dimensions BEFORE:', canvas.width, canvas.height);
      
      // Set canvas dimensions BEFORE getting context
      this.canvasWidth = window.innerWidth;
      this.canvasHeight = window.innerHeight;
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
      
      console.log('AnimatedBackground: Canvas dimensions AFTER:', canvas.width, canvas.height);
      
      this.ctx = canvas.getContext('2d');
      
      if (!this.ctx) {
        console.error('AnimatedBackground: Failed to get 2D context');
        this.tryInitialize(attempts + 1);
        return;
      }

      console.log('AnimatedBackground: Context obtained successfully');
      
      // Test draw to verify canvas is working
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(10, 10, 50, 50);
      console.log('AnimatedBackground: Test rectangle drawn at 10,10 size 50x50');
      
      // Force a visible test
      this.ctx.fillStyle = '#00ff00';
      this.ctx.fillRect(100, 100, 200, 200);
      console.log('AnimatedBackground: Large green test rectangle drawn');
      
      this.isInitialized = true;
      this.initializeNodes();
      console.log('AnimatedBackground: Nodes initialized:', this.nodes.length);
      
      this.animate();
      console.log('AnimatedBackground: Animation started');
    }, 100 * (attempts + 1));
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    
    if (this.canvasRef && this.canvasRef.nativeElement) {
      const canvas = this.canvasRef.nativeElement;
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
    }
    
    this.redistributeNodes();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    this.isMouseActive = true;
  }

  @HostListener('window:mouseleave')
  onMouseLeave() {
    this.isMouseActive = false;
  }

  private initializeNodes() {
    this.nodes = [];
    for (let i = 0; i < this.NODE_COUNT; i++) {
      this.nodes.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        vx: (Math.random() - 0.5) * this.NODE_SPEED,
        vy: (Math.random() - 0.5) * this.NODE_SPEED,
        radius: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private redistributeNodes() {
    this.nodes.forEach(node => {
      if (node.x > this.canvasWidth) node.x = this.canvasWidth;
      if (node.y > this.canvasHeight) node.y = this.canvasHeight;
    });
  }

  private updateNodes() {
    this.nodes.forEach(node => {
      // Update position
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x <= 0 || node.x >= this.canvasWidth) {
        node.vx *= -1;
        node.x = Math.max(0, Math.min(this.canvasWidth, node.x));
      }
      if (node.y <= 0 || node.y >= this.canvasHeight) {
        node.vy *= -1;
        node.y = Math.max(0, Math.min(this.canvasHeight, node.y));
      }

      // Mouse interaction
      if (this.isMouseActive) {
        const dx = this.mouseX - node.x;
        const dy = this.mouseY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.MOUSE_INFLUENCE_RADIUS) {
          const force = (this.MOUSE_INFLUENCE_RADIUS - distance) / this.MOUSE_INFLUENCE_RADIUS;
          const angle = Math.atan2(dy, dx);
          node.vx += Math.cos(angle) * force * 0.02;
          node.vy += Math.sin(angle) * force * 0.02;
          
          // Limit velocity
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > this.NODE_SPEED * 3) {
            node.vx = (node.vx / speed) * this.NODE_SPEED * 3;
            node.vy = (node.vy / speed) * this.NODE_SPEED * 3;
          }
        }
      }

      // Update pulse phase for glowing effect
      node.pulsePhase += 0.02;
    });
  }

  private updateConnections() {
    this.connections = [];
    
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const node1 = this.nodes[i];
        const node2 = this.nodes[j];
        
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.MAX_CONNECTION_DISTANCE) {
          const opacity = (this.MAX_CONNECTION_DISTANCE - distance) / this.MAX_CONNECTION_DISTANCE;
          this.connections.push({
            node1,
            node2,
            opacity: opacity * 0.4,
            distance
          });
        }
      }
    }
  }

  private drawNodes() {
    if (!this.ctx) return;
    
    this.nodes.forEach(node => {
      const pulseIntensity = Math.sin(node.pulsePhase) * 0.3 + 0.7;
      const glowRadius = node.radius * (2 + pulseIntensity);
      
      // Create gradient for glow effect
      const gradient = this.ctx!.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, glowRadius
      );
      
      // Cyan-blue glow
      gradient.addColorStop(0, `rgba(64, 224, 255, ${node.opacity * pulseIntensity})`);
      gradient.addColorStop(0.4, `rgba(0, 191, 255, ${node.opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
      
      // Draw glow
      this.ctx!.fillStyle = gradient;
      this.ctx!.beginPath();
      this.ctx!.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      this.ctx!.fill();
      
      // Draw core node
      this.ctx!.fillStyle = `rgba(255, 255, 255, ${node.opacity * 0.9})`;
      this.ctx!.beginPath();
      this.ctx!.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
      this.ctx!.fill();
    });
  }

  private drawConnections() {
    if (!this.ctx) return;
    
    this.connections.forEach(connection => {
      const { node1, node2, opacity } = connection;
      
      // Create gradient for connection line
      const gradient = this.ctx!.createLinearGradient(
        node1.x, node1.y, node2.x, node2.y
      );
      gradient.addColorStop(0, `rgba(64, 224, 255, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(0, 191, 255, ${opacity * 1.2})`);
      gradient.addColorStop(1, `rgba(64, 224, 255, ${opacity})`);
      
      this.ctx!.strokeStyle = gradient;
      this.ctx!.lineWidth = 1;
      this.ctx!.beginPath();
      this.ctx!.moveTo(node1.x, node1.y);
      this.ctx!.lineTo(node2.x, node2.y);
      this.ctx!.stroke();
    });
  }

  private drawBackground() {
    if (!this.ctx) return;
    
    // Create gradient background directly on canvas
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.25, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(0.75, '#0f3460');
    gradient.addColorStop(1, '#0a0a0a');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private animate() {
    if (!this.ctx || !this.isInitialized) {
      console.warn('AnimatedBackground: Cannot animate - context not ready');
      return;
    }
    
    // Draw background gradient on canvas
    this.drawBackground();
    
    // Update and draw
    this.updateNodes();
    this.updateConnections();
    this.drawConnections();
    this.drawNodes();
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}