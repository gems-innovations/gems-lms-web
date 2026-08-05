import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export interface IRadarSeries {
  label: string;
  color: string;
  values: number[];
}

interface IPoint { x: number; y: number; }
interface ILabel { x: number; y: number; text: string; anchor: string; }
interface ISeriesGeom { label: string; color: string; points: string; dots: IPoint[]; }

const RINGS = 4;

@Component({
  selector: 'lib-radar-chart',
  standalone: true,
  templateUrl: './radar-chart.component.html',
  styleUrl: './radar-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarChartComponent {
  readonly axes   = input.required<string[]>();
  readonly series = input.required<IRadarSeries[]>();
  readonly max    = input<number>(100);
  readonly size   = input<number>(280);

  protected readonly cx     = computed(() => this.size() / 2);
  protected readonly cy     = computed(() => this.size() / 2);
  protected readonly radius = computed(() => this.size() / 2 - 52);

  private point(axisIndex: number, value: number): IPoint {
    const n = this.axes().length;
    const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / n;
    const r = (Math.max(0, Math.min(value, this.max())) / this.max()) * this.radius();
    return { x: this.cx() + r * Math.cos(angle), y: this.cy() + r * Math.sin(angle) };
  }

  protected readonly rings = computed<string[]>(() => {
    const n = this.axes().length;
    return Array.from({ length: RINGS }, (_, ring) => {
      const level = ((ring + 1) / RINGS) * this.max();
      return Array.from({ length: n }, (_, i) => {
        const p = this.point(i, level);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(' ');
    });
  });

  protected readonly spokes = computed<IPoint[]>(() =>
    this.axes().map((_, i) => this.point(i, this.max()))
  );

  protected readonly labels = computed<ILabel[]>(() => {
    const n = this.axes().length;
    return this.axes().map((text, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = this.radius() + 18;
      const x = this.cx() + r * Math.cos(angle);
      const y = this.cy() + r * Math.sin(angle);
      const cos = Math.cos(angle);
      const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
      return { x, y, text: text.length > 16 ? text.slice(0, 15) + '…' : text, anchor };
    });
  });

  protected readonly seriesGeom = computed<ISeriesGeom[]>(() =>
    this.series().map(s => {
      const dots = s.values.map((v, i) => this.point(i, v));
      return {
        label: s.label,
        color: s.color,
        points: dots.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
        dots,
      };
    })
  );
}
