document.addEventListener('DOMContentLoaded', () => {
    const chartDom = document.getElementById('chart-container');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: '访问城市统计图'
        },
        tooltip: {},
        xAxis: {
            type: 'category',
            data: ['南宁', '广州', '上海']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: [5, 10, 3],
            type: 'bar'
        }]
    };

    myChart.setOption(option);
});
