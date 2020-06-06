# OctoPrint-BedLevelVisualizer

This plugin visualises the output from various firmware that support bed mesh leveling, noteably the Prusa `G81` mesh leveling report and the Marlin `G29 T` bed topography report. The plugin utilizes [Plotly](https://plot.ly/plotly-js-scientific-d3-charting-library/) js library to render a 3D surface of the bed's reported mesh on a tab within OctoPrint.

## Supported Firmware:

- Marlin 2.0.5.3
- Prusa i3 MK2 to MK3S version 3.2.3 to 3.8.1
- Klipper
- Older Marlin and Repetier firmware.

## Example

It converts this:

```
Send: G29 T
Recv: echo:Home XYZ first
Recv:
Recv: Bed Topography Report:
Recv:
Recv: (0,9)                                                                   (9,9)
Recv: (30,270)                                                                (270,270)
Recv:  -0.452   -0.319   -0.237    0.287    0.140    0.139    0.136    0.317    0.247    0.247
Recv:
Recv:  -0.195   -0.273   -0.180   -0.178    0.014    0.018    0.111    0.214    0.210    0.210
Recv:
Recv:  -0.270   -0.252   -0.151   -0.119    0.009    0.016    0.072    0.249    0.224    0.224
Recv:
Recv:  -0.307   -0.205   -0.163   -0.124   -0.094   -0.002    0.036    0.151    0.174    0.196
Recv:
Recv:  -0.186   -0.130   -0.152   -0.105   -0.144   -0.007    0.044    0.093    0.181    0.270
Recv:
Recv:  -0.010   -0.077   -0.073    0.155   -0.006   -0.133    0.110    0.046    0.109    0.173
Recv:
Recv:   0.059   -0.094   -0.072   -0.002   -0.006    0.037    0.050    0.065    0.124    0.184
Recv:
Recv:  -0.057   -0.028    0.039    0.028    0.024    0.005    0.102    0.165    0.176    0.187
Recv:
Recv:   0.067    0.015    0.096    0.117    0.001    0.079    0.138    0.346    0.185    0.185
Recv:
Recv: [ 0.071]   0.014    0.061   -0.127    0.167    0.040    0.098    0.195    0.194    0.194
Recv: (30,30)                                                                    (270,30)
Recv: (0,0)                                                                     (9,0)
Recv: ok P15 B3
```

into this

![screenshot](screenshot.png)

## [Wiki](wiki/index.md)

For more info, see the [wiki](wiki/index.md)

---

## Known Issues

- Since version 0.1.3 there is a python dependency on numpy. As a result; if you don't already have numpy the install can take in excess of 30 minutes to complete on a pi. Just be patient and let it run and eventually the plugin install will finish.
- If your device have less than 512MB of ram your numpy installation would most likely fail. See [#141](https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/issues/141#issuecomment-542227338) for solution.
- If you have Marlin's Auto Temperature Reporting Feature enabled you will want to have M155 S30 and M155 S3 surrounding your G29 command, see settings screenshot, otherwise the collected data will be tainted.
- ~~Currently there is a conflict with the TempsGraph plugin. If you have this plugin installed you will receive an error that Plotyle.react is not a function. There is a version update pending on that plugin to resolve this issue, just waiting on the author to release.~~ Resolved with TempsGraph release [0.3.3](https://github.com/1r0b1n0/OctoPrint-Tempsgraph/releases/tag/0.3.3).

---

## Most recent changelog
**[0.1.13](https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/releases/tag/0.1.13)** (03/28/2020)

**Added**

- Screw adjustment angle calculations in degrees based on screw size

**Updated**

- Default timeout value increased to 30 minutes to hopefully resolve confusion
- Timeout notification to hopefully make it more clear what needs to be fixed

**Fixed**

- New webcam feature consuming network bandiwdth while idle or not visible

**Thanks**
Thanks to [@LMS0815](https://github.com/LMS0815) for screw adjustment angle changes mentioned above

## [All releases](https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/releases)

---

## To-Do

- [ ] Pause standard OctoPrint temperature polling or squash the responses until processing is completed.
- [x] ~~Orientation testing to verify axes are in correct direction.~~ added settings to allow controlling the orientation.
- [x] ~~Calculate bed dimensions and apply to probe points for display on graph, #28.~~

---

## Support My Efforts

I, jneilliii, programmed this plugin for fun and do my best effort to support those that have issues with it, please return the favor and leave me a tip if you find this plugin helpful.

[![paypal](https://jneilliii.github.io/images/paypal-with-text.png)](https://paypal.me/jneilliii)

<small>No paypal.me? Send funds via PayPal to jneilliii&#64;gmail&#46;com</small>
