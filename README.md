# OctoPrint-BedLevelVisualizer

![screenshot](screenshot.png)

This plugin utilizes [Plotly](https://plot.ly/plotly-js-scientific-d3-charting-library/) js library to render a 3D surface of the bed's reported mesh on a tab within OctoPrint.

**Note:** Currently only tested with a UBL report, but should work with others as long as `G29 T1` command responds like below. Also currently reuires Marlin temperature auto-reporting enabled until I can figure out how to pause OctoPrint's temperature polling.

```
Send: G29 T1
Recv: echo:Home XYZ first
Recv: 
Recv: Bed Topography Report for CSV:
Recv: 
Recv: 0.256,0.170,0.140,0.535,0.183,0.159,0.054,0.197,0.105,0.105
Recv: 0.488,0.277,0.174,-0.049,0.125,0.020,0.027,0.070,-0.006,-0.006
Recv: 0.479,0.197,0.220,0.062,0.116,0.062,-0.053,0.169,0.038,0.038
Recv: 0.315,0.306,0.126,0.079,-0.096,-0.008,0.014,-0.105,0.011,0.127
Recv: 0.444,0.362,0.162,0.084,-0.160,-0.100,-0.074,-0.079,0.038,0.154
Recv: 0.506,0.293,0.195,0.274,0.093,-0.040,0.040,-0.083,-0.131,-0.131
Recv: 0.583,0.265,0.174,0.517,0.042,-0.021,-0.083,-0.094,-0.130,-0.130
Recv: 0.425,0.267,0.270,0.370,0.073,-0.125,-0.075,-0.057,-0.056,-0.056
Recv: 0.499,0.356,0.280,0.266,0.056,0.053,-0.021,0.120,-0.171,-0.171
Recv: 0.438,0.265,0.188,-0.154,0.141,0.005,-0.041,-0.117,-0.135,-0.135
Recv: ok P15 B3
```

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/archive/master.zip

## Changelog

**[0.0.2]** (04/15/2018)

**Added**
  - Settings dialog to update the GCODE command used to report bed topology.
  - Improved performance with option for storing the mesh in config.yaml (default).

**Fixed**
  - Reversed point order to fix graphing misorientation.
	
**[0.0.1]** (04/14/2018)

**Initial Release**

[0.0.1]: https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/tree/0.0.1
[0.0.2]: https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/tree/0.0.2

## To-Do
- [ ] Pause standard OctoPrint temperature polling or squash the responses until processing is completed.