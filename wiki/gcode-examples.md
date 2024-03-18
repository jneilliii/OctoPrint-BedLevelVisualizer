# Example GCODE
## Marlin

For both methods, if your firmware has `AUTO_REPORT_TEMPERATURES` enabled, set the temperature reporting period to longer than it takes for your levelling to complete (in seconds) to prevent pollution of the output by using [`M155`](https://marlinfw.org/docs/gcode/M155.html).

### Bilinear bed levelling
See [G29 - Bed Leveling (Bilinear)](https://marlinfw.org/docs/gcode/G029-abl-bilinear.html)

```
M140 S60 ; starting by heating the bed for nominal mesh accuracy
M117 Homing all axes ; send message to printer display
G28      ; home all axes
M420 S0  ; Turning off bed leveling while probing, if firmware is set
         ; to restore after G28
M117 Heating the bed ; send message to printer display
M190 S60 ; waiting until the bed is fully warmed up
M300 S1000 P500 ; chirp to indicate bed mesh levels is initializing
M117 Creating the bed mesh levels ; send message to printer display
M155 S30 ; reduce temperature reporting rate to reduce output pollution
@BEDLEVELVISUALIZER	; tell the plugin to watch for reported mesh
G29 T	   ; run bilinear probing
M155 S3  ; reset temperature reporting
M140 S0 ; cooling down the bed
M500 ; store mesh in EEPROM
M300 S440 P200 ; make calibration completed tones
M300 S660 P250
M300 S880 P300
M117 Bed mesh levels completed ; send message to printer display
```

### Unified Bed Leveling (UBL)
See [G29 - Bed Leveling (Unified)](https://marlinfw.org/docs/gcode/G029-ubl.html)

```
G28       ; home all axes
M420 S0   ; Turning off bed leveling while probing, if firmware is set
          ; to restore after G28
M155 S30  ; reduce temperature reporting rate to reduce output pollution
M190 S65  ; (optional) wait for the bed to get up to temperature
G29 P1    ; automatically populate mesh with all reachable points
G29 P3    ; infer the rest of the mesh values
G29 P3    ; infer the rest of the mesh values again
@BEDLEVELVISUALIZER	; tell the plugin to watch for reported mesh
M420 S1 V ; enabled leveling and report the new mesh
G29 S0    ; Save UBL mesh points to slot 0 (EEPROM).
G29 F 10.0 ; Set Fade Height for correction at 10.0 mm.
G29 A     ; Activate the UBL System.
M500      ; save the current setup to EEPROM
M155 S3   ; reset temperature reporting
M140 S0   ; cooling down the bed
```

## Prusa Firmware
```
G80			; run mesh bed leveling routine.
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G81			; report mesh bed leveling status.
```
Note the i3 MK3S requires the Y-axis to be flipped.

### Prusa Mini (Pre 5.x firmware)
This may or may not work for you on 5.x firmware. Some users have [reported](https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/issues/643) [issues](https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/issues/652) with this gcode. There is some updated gcode below which is reported to be working on 5.1.2 firmware.
```
M104 S170		; set extruder temp for bed leveling
M140 S60		; set bed temp
M109 R170		; wait for bed leveling temp
M190 S60		; wait for bed temp
G28			; home all without mesh bed level
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G29			; mesh bed leveling
M104 S0			; cool down head
M140 S0			; cooling down the bed
```

### Prusa Mini (5.1.2+ firmware)
This updated gcode should solve any issues on 5.1.2 firmware 

```
M104 S170		; set extruder temp for bed leveling
M140 S60		; set bed temp
M109 R170		; wait for bed leveling temp
M190 S60		; wait for bed temp
G28			; home all without mesh bed level
M155 S30
G29
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G29 T			; mesh bed leveling
M155 S3
M104 S0			; cool down head
M140 S0			; cooling down the bed
```

### Prusa XL5T (5.1.2+ firmware)
```
M104 T1 S0 
M104 T2 S0 
M104 T3 S0 
M104 T4 S0

M140 S60 ; set bed temp
M109 T0 S175 ; wait for temp

; Home XY
G28 XY
; try picking tools used in print
G1 F24000

; select tool that will be used to home & MBL
T0 S1 L0 D0
; home Z with MBL tool
M84 E ; turn off E motor
G28 Z
G0 Z5 ; add Z clearance
M190 S60 ; wait for bed temp
G29 G ; absorb heat
; move to the nozzle cleanup area
G1 X32.0999 Y-6.90006 Z5 F24000
M302 S160 ; lower cold extrusion limit to 160C
G1 E-2 F2400 ; retraction for nozzle cleanup
; nozzle cleanup
M84 E ; turn off E motor
G29 P9 X260 Y-6.90006 W32 H7
G0 Z5 F480 ; move away in Z
M107 ; turn off the fan
; MBL
M84 E ; turn off E motor
G29 P1 ; invalidate mbl & probe print area
G29 P1 X30 Y0 W50 H20 C ; probe near purge place
G29 P3.2 ; interpolate mbl probes
G29 P3.13 ; extrapolate mbl outside probe area
G29 A ; activate mbl
@BEDLEVELVISUALIZER
G29 T
G1 Z10 F720 ; move away in Z
G1 F24000
P0 S1 L1 D0; park the tool
; set extruder temp
M104 T0 S0
M140 S0
```

## Klipper
Use the following command for Klipper (per https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/issues/92):
```
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
BED_MESH_OUTPUT		; report the bed leveling mesh points.
```
## ARTILLERY SIDEWINDER X2
```
M104 S200		; set extruder temp for bed leveling
M140 S60		; set bed temp
M109 R200		; wait for bed leveling temp
M190 S60		; wait for bed temp
G28			    ; home all without mesh bed level
@BEDLEVELVISUALIZER	; instruct plugin to start recording responses from printer.
G29			; mesh bed leveling 
M104 S0 ; turn off extruder
M140 S0 ; turn off bed
G1 X0 Y0 F1000 ;        
M84     ; disable motors
M106 S0 ; turn off fan
```
