document.addEventListener('DOMContentLoaded', () => {
    const chartDom = document.getElementById('chart-container');
    
    // 动态加载 ECharts 库
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
    script.onload = () => {
        const myChart = echarts.init(chartDom);
        
        // 使用 CSS 主题色变量
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#0f531e';
        const primaryLight = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim() || '#1c7a2f';

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: function(params) {
                    const province = params[0].name;
                    const year = params[0].value;
                    const cityCount = params[1].value;
                    const yearDisplay = year === 2015 ? '2004' : year;
                    return `${province}<br/>初次探索时间：${yearDisplay}年<br/>走过的城市数量：${cityCount}`;
                }
            },
            grid: {
                left: '3%',
                right: '8%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                name: '省级行政区',
                splitLine: { show: false },
                axisLine: { show: true, lineStyle: { color: '#000' } },
                axisLabel: {
                    color: '#000'
                },
                data: ['广西', '广东', '福建', '浙江', '湖北', '湖南','江西','云南',
                        '山东','陕西','北京','上海','重庆','香港','澳门']
            },
            yAxis: {
                type: 'value',
                min: 2015,
                max: 2026,
                interval: 1,
                name: '初次探索年份',
                nameLocation: 'end',
                nameTextStyle: {
                    verticalAlign: 'bottom',
                    padding: [0, 0, 10, 0],
                    fontWeight: 'bold',
                    color: '#000'
                },
                splitLine: { show: false },
                axisLabel: {
                    color: '#000',
                    formatter: function(value) {
                        if (value === 2015) return '2015年以前';
                        if (value === 2026) return '';
                        return value;
                    }
                }
            },
            series: [
                {
                    name: '初次探索年份',
                    type: 'bar',
                    stack: 'Total',
                    itemStyle: {
                        borderColor: 'transparent',
                        color: 'transparent'
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: 'transparent',
                            color: 'transparent'
                        }
                    },
                    data: [2015, 2016, 2019, 2024, 2022, 2023, 2024, 2019, 2023, 2024, 2025, 2021, 2025, 2017, 2016]
                },
                {
                    name: '走过的城市数量',
                    type: 'bar',
                    stack: 'Total',
                    label: {
                        show: true,
                        position: 'inside',
                        color: 'white', // 确保标签文字在深色背景下可见
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        color: primaryColor, // 使用主题色
                        borderColor: primaryLight, // 边框使用较浅的主题色
                        borderWidth: 1
                    },
                    emphasis: {
                        itemStyle: {
                            color: primaryLight, // 悬停时使用较浅的主题色
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        }
                    },
                    data: [6, 3, 1, 2, 2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1]
                }
            ]
        };

        myChart.setOption(option);
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => {
            myChart.resize();
        });
    };
    
    document.head.appendChild(script);
});
