document.addEventListener('DOMContentLoaded', () => {
    const chartDom = document.getElementById('chart-container');
    const myChart = echarts.init(chartDom);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
            type: 'shadow'
            },
            formatter: function (params) {
            const province = params[0].name;
            const year = params[0].value;
            const cityCount = params[1].value;
            const yearDisplay = year === 2015 ? '2004' : year;
            return `${province}<br/>初次探索时间：${yearDisplay}年<br/>走过的城市数量：${cityCount}`
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            name: '省份',
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
            min:2015,
            max:2026,
            interval:1,
            name: '初次探索年份',
            nameLocation: 'end',
            nameTextStyle: {
                verticalAlign: 'bottom',
                padding: [0, 0, 10, 0], // 名称和轴线之间的间距
                fontWeight: 'bold',
                color: '#000'
            },
            splitLine: { show: false },
            axisLabel: {
                color: '#000',
                formatter: function (value) {
                    if (value === 2015) return '2015年以前';
                    if (value === 2026) return ''; // 不显示2026
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
                position: 'inside'
            },
            data: [6, 3, 1, 2, 2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1]
            }
        ]

    };

    myChart.setOption(option);
});
