import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'app-statistics-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './statistics-dashboard.component.html',
  styleUrls: ['./statistics-dashboard.component.scss']
})
export class StatisticsDashboardComponent implements OnInit {
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false // Ocultar la leyenda
      }
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Reservas por Mes' }
    ]
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false // Ocultar la leyenda predeterminada
      }
    }
  };
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }
    ]
  };

  get pieChartLegendItems(): { text: string, color: string, count: number, percentage: number }[] {
    if (!this.pieChartData.labels || !this.pieChartData.datasets[0].backgroundColor || !this.pieChartData.datasets[0].data) {
      return [];
    }
    const totalBookings = (this.pieChartData.datasets[0].data as number[]).reduce((sum, current) => sum + current, 0);

    return this.pieChartData.labels.map((label, index) => ({
      text: label as string,
      color: (this.pieChartData.datasets[0].backgroundColor as string[])[index],
      count: (this.pieChartData.datasets[0].data as number[])[index],
      percentage: totalBookings > 0 ? ((this.pieChartData.datasets[0].data as number[])[index] / totalBookings) * 100 : 0
    }));
  }

  constructor(private statisticsService: StatisticsService) { }

  ngOnInit(): void {
    this.statisticsService.getMonthlyBookings().subscribe(data => {
      this.barChartData.labels = data.map(d => d.month);
      this.barChartData.datasets[0].data = data.map(d => d.count);
    });

    this.statisticsService.getServiceDistribution().subscribe(data => {
      this.pieChartData.labels = data.map(d => d.serviceName);
      this.pieChartData.datasets[0].data = data.map(d => d.count);
    });
  }

  // Métodos para el modal (no se usan directamente en el HTML, Bootstrap lo maneja)
  // showModal() {
  //   this.showServiceDetailsModal = true;
  // }

  // hideModal() {
  //   this.showServiceDetailsModal = false;
  // }
}
