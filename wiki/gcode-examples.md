# Example GCODE
## Marlin

For both methods, if your firmware has `AUTO_REPORT_TEMPERATURES` enabled, set the temperature reporting period to longer than it takes for your levelling to complete (in seconds) to prevent pollution of the output by using [`M155`](https://marlinfw.org/docs/gcode/M155.html).

### Bilinear bed levelling
See [G29 - Bed Leveling (Bilinear)](https://marlinfw.org/docs/gcode/G029-abl-bilinear.html)

```
M140 S60 ; starting by heating the bed for nominal mesh accuracy
M117 Homing all axes ; send message to printer display
G28      ; home all axes
M117 Heating the bed ; send message to printer display
M190 S60 ; waiting until the bed is fully warmed up
M300 S1000 P500 ; chirp to indicate bed mesh levels is initializing
M117 Creating the bed mesh levels ; send message to printer display
M155 S30 ; reduce temperature reporting rate to reduce output pollution
@BEDLEVELVISUALIZER	; tell the plugin to watch for reported mesh
G29 T	   ; run bilinear probing
M155 S3  ; reset temperature reporting
M140 S0 ; cooling down the bed
M300 S440 P200 ; make calibration completed tones
M300 S660 P250
M300 S880 P300
M117 Bed mesh levels completed ; send message to printer display
```

### Unified Bed Leveling (UBL)
See [G29 - Bed Leveling (Unified)](https://marlinfw.org/docs/gcode/G029-ubl.html)

```
G28       ; home all axes
M155 S30  ; reduce temperature reporting rate to reduce output pollution
M190 S65  ; (optional) wait for the bed to get up to temperature
G29 P1    ; automatically populate mesh with all reachable points
G29 P3    ; infer the rest of the mesh values
@BEDLEVELVISUALIZER	; tell the plugin to watch for reported mesh
M420 S1 V ; enabled leveling and report the new mesh
M500      ; save the new mesh to EEPROM
M155 S3   ; reset temperature reporting
```

## Prusa Firmware
```
G80			; run mesh bed leveling routine.
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G81			; report mesh bed leveling status.
```

### Prusa Mini
```
M104 S170		; set extruder temp for bed leveling
M140 S60		; set bed temp
M109 R170		; wait for bed leveling temp
M190 S60		; wait for bed temp
G28			; home all without mesh bed level
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G29			; mesh bed leveling 
```

## Klipper
Use the following command for Klipper (per https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/issues/92):
```
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
BED_MESH_OUTPUT		; report the bed leveling mesh points.
```
