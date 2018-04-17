# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import re

class bedlevelvisualizer(octoprint.plugin.StartupPlugin,
				octoprint.plugin.TemplatePlugin,
				octoprint.plugin.AssetPlugin,
                octoprint.plugin.SettingsPlugin):
				
	def __init__(self):
		self.processing = False
		self.mesh = []
	
	##~~ SettingsPlugin
	def get_settings_defaults(self):
		return dict(command="G28\nG29 T1",stored_mesh=[],save_mesh=True,report_flag="Bilinear Leveling Grid:",report_types=["Bed Topography Report:","Bilinear Leveling Grid:","Subdivided with CATMULL ROM Leveling Grid:","Measured points:"])

	##~~ StartupPlugin
	def on_after_startup(self):
		self._logger.info("OctoPrint-BedLevelVisualizer loaded!")
		
	##~~ AssetPlugin
	def get_assets(self):
		return dict(
			js=["js/bedlevelvisualizer.js","js/plotly-latest.min.js"]
		)

	##~~ GCODE hook
	def processGCODE(self, comm, line, *args, **kwargs):
		if self._settings.get(["report_flag"]) in line:
			self.processing = True
			self.mesh = []
			return line
			
		if self.processing and "ok" not in line and re.match(r"\s?\d?\s?(\+?-?\[?\s?\d+.\d+[\]?,?\s?]+)+", line.strip()):
			new_line = re.sub(r"< \d+:\d+:\d+(\s+(AM|PM))?:","",line.strip())
			new_line = re.sub(r"[\[\]]\s?","",new_line)
			new_line = re.sub(r"\s+","\t",new_line)	
			new_line = new_line.split("\t")
			if self._settings.get(["report_flag"]) in ["Bilinear Leveling Grid:","Subdivided with CATMULL ROM Leveling Grid:","Measured points:"]:
				new_line.pop(0)
			if len(new_line) > 0:
				self.mesh.append(new_line)
			return line
		
		if self.processing and "ok" in line:
			self.processing = False
			# if self._settings.get(["report_flag"]) not in ["Bilinear Leveling Grid:","Subdivided with CATMULL ROM Leveling Grid:","Measured points:"]:
				# self.mesh.reverse()
			self._plugin_manager.send_plugin_message(self._identifier, dict(mesh=self.mesh))
		
		return line
		
	##~~ Softwareupdate hook
	def get_update_information(self):
		return dict(
			bedlevelvisualizer=dict(
				displayName="Bed Visualizer",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="jneilliii",
				repo="OctoPrint-BedLevelVisualizer",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/archive/{target_version}.zip"
			)
		)

__plugin_name__ = "Bed Visualizer"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = bedlevelvisualizer()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.processGCODE,
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
