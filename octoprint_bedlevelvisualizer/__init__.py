# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import re
import numpy as np
import logging
import flask

class bedlevelvisualizer(octoprint.plugin.StartupPlugin,
				octoprint.plugin.TemplatePlugin,
				octoprint.plugin.AssetPlugin,
				octoprint.plugin.SettingsPlugin,
				octoprint.plugin.WizardPlugin,
				octoprint.plugin.SimpleApiPlugin):

	def __init__(self):
		self.processing = False
		self.mesh_collection_canceled = False
		self.old_marlin = False
		self.old_marlin_offset = 0
		self.repetier_firmware = False
		self.mesh = []
		self.box = []
		self.flip_x = False
		self.flip_y = False
		self._logger = logging.getLogger("octoprint.plugins.bedlevelvisualizer")
		self._bedlevelvisualizer_logger = logging.getLogger("octoprint.plugins.bedlevelvisualizer.debug")

	##~~ SettingsPlugin

	def get_settings_defaults(self):
		return dict(command="",
			stored_mesh=[],
			stored_mesh_x=[],
			stored_mesh_y=[],
			stored_mesh_z_height=2,
			save_mesh=True,
			mesh_timestamp="",
			flipX=False,
			flipY=False,
			stripFirst=False,
			use_center_origin=False,
			use_relative_offsets=False,
			timeout=1800,
			rotation=0,
			ignore_correction_matrix=False,
			screw_hub=0.5,
			mesh_unit=1,
			reverse=False,
			showdegree=False,
			imperial=False,
			descending_y=False,
			descending_x=False,
			debug_logging = False,
			commands=[],
			show_labels=True,
			show_webcam=False)

	def get_settings_version(self):
		return 1

	def on_settings_migrate(self, target, current=None):
		if current is None or current < 1:
			# Loop through commands adding new fields
			commands_new = []
			self._logger.info(self._settings.get(['commands']))
			for command in self._settings.get(['commands']):
				command["confirmation"] = False
				command["input"] = []
				command["message"] = ""
				commands_new.append(command)
			self._settings.set(["commands"],commands_new)

	def on_settings_save(self, data):
		old_debug_logging = self._settings.get_boolean(["debug_logging"])

		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

		new_debug_logging = self._settings.get_boolean(["debug_logging"])
		if old_debug_logging != new_debug_logging:
			if new_debug_logging:
				self._bedlevelvisualizer_logger.setLevel(logging.DEBUG)
			else:
				self._bedlevelvisualizer_logger.setLevel(logging.INFO)

	##~~ StartupPlugin
	def on_startup(self, host, port):
		# setup customized logger
		from octoprint.logging.handlers import CleaningTimedRotatingFileHandler
		bedlevelvisualizer_logging_handler = CleaningTimedRotatingFileHandler(self._settings.get_plugin_logfile_path(postfix="debug"), when="D", backupCount=3)
		bedlevelvisualizer_logging_handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s"))
		bedlevelvisualizer_logging_handler.setLevel(logging.DEBUG)

		self._bedlevelvisualizer_logger.addHandler(bedlevelvisualizer_logging_handler)
		self._bedlevelvisualizer_logger.setLevel(logging.DEBUG if self._settings.get_boolean(["debug_logging"]) else logging.INFO)
		self._bedlevelvisualizer_logger.propagate = False

	def on_after_startup(self):
		self._logger.info("OctoPrint-BedLevelVisualizer loaded!")

	##~~ AssetPlugin
	def get_assets(self):
		return dict(
			js=["js/jquery-ui.min.js","js/knockout-sortable.js","js/fontawesome-iconpicker.js","js/ko.iconpicker.js","js/plotly-latest.min.js","js/bedlevelvisualizer.js"],
			css=["css/font-awesome.min.css","css/font-awesome-v4-shims.min.css","css/fontawesome-iconpicker.css","css/bedlevelvisualizer.css"]
		)

	##~~ WizardPlugin
	def is_wizard_required(self):
		if not self._settings.get(["command"]) == "":
			return False
		else:
			return True

	def is_wizard_ignored(self, seen_wizards, implementation):
		if not self._settings.get(["command"]) == "":
			return True
		else:
			return False

	# def get_wizard_version(self):
		# return 1

	##~~ GCODE hook
	def flagMeshCollection(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
		if cmd.startswith("@BEDLEVELVISUALIZER"):
			self.mesh = []
			self.box = []
			if not self.mesh_collection_canceled and not self.processing:
				self.processing = True
			if self.mesh_collection_canceled:
				self.mesh_collection_canceled = False
				return
			self._bedlevelvisualizer_logger.debug("mesh collection started")
			self.processing = True
		return

	def processGCODE(self, comm, line, *args, **kwargs):
		if not self.processing:
			return line

		self._bedlevelvisualizer_logger.debug(line.strip())

		if self._settings.get_boolean(["ignore_correction_matrix"]) and re.match(r"^(Mesh )?Bed Level (Correction Matrix|data):.*$", line.strip()):
			line = "ok"

		if "ok" not in line:
			if re.match(r"^((G33.+)|(Bed.+)|(\d+\s)|(\|\s*)|(\s*\[\s+)|(\[?\s?\+?\-?\d?\.\d+\]?\s*\,?)|(\s?\.\s*)|(NAN\,?))+(\s+\],?)?$", line.strip()):
				new_line = re.findall(r"(\+?\-?\d*\.\d*)",line)
				self._bedlevelvisualizer_logger.debug(new_line)

				if re.match(r"^Bed x:.+$", line.strip()):
					self.old_marlin = True
					self._bedlevelvisualizer_logger.debug("using old marlin flag")

				if re.match(r"^G33 X.+$", line.strip()):
					self.repetier_firmware = True
					self._bedlevelvisualizer_logger.debug("using repetier flag")

				if self._settings.get(["stripFirst"]):
					new_line.pop(0)
				if len(new_line) > 0:
					if bool(self.flip_x) != bool(self._settings.get(["flipX"])):
						new_line.reverse()
					self.mesh.append(new_line)
				return line

			if re.match(r"^Subdivided with CATMULL ROM Leveling Grid:.*$", line.strip()):
				self._bedlevelvisualizer_logger.debug("resetting mesh to blank because of CATMULL subdivision")
				self.mesh = []
				return line

			if re.findall(r"\(\s*(\d+),\s*(\d+)\)", line.strip()):
				box = re.findall(r"\(\s*(\d+),\s*(\d+)\)", line.strip())
				if len(box) == 2:
					self.box += [[float(x), float(y)] for x, y in box]
				if len(self.box) == 2:
					if self.box[0][0] > self.box[1][0]:
						self.flip_x = True
				if len(self.box) == 4:
					if self.box[0][1] > self.box[3][1]:
						self.flip_y = True
				return line

		if self.old_marlin and re.match(r"^Eqn coefficients:.+$", line.strip()):
			self.old_marlin_offset = re.sub("^(Eqn coefficients:.+)(\d+.\d+)$",r"\2", line.strip())
			self._bedlevelvisualizer_logger.debug("using old marlin offset")

		if "Home XYZ first" in line or "Invalid mesh" in line:
			reason = "data is invalid" if "Invalid" in line else "homing required"
			self._bedlevelvisualizer_logger.debug("stopping mesh collection because %s" % reason)

		if "Home XYZ first" in line:
			self._plugin_manager.send_plugin_message(self._identifier, dict(error=line.strip()))
			self.processing = False
			return line

		if ("ok" in line or (self.repetier_firmware and "T:" in line)) and len(self.mesh) > 0:
			octoprint_printer_profile = self._printer_profile_manager.get_current()
			volume = octoprint_printer_profile["volume"]
			bed_type = volume["formFactor"]
			custom_box = volume["custom_box"]
			# see if we have a custom bounding box
			if custom_box:
				min_x = custom_box["x_min"]
				max_x = custom_box["x_max"]
				min_y = custom_box["y_min"]
				max_y = custom_box["y_max"]
				min_z = custom_box["z_min"]
				max_z = custom_box["z_max"]
			else:
				min_x = 0
				max_x = volume["width"]
				min_y = 0
				max_y = volume["depth"]
				min_z = 0
				max_z = volume["height"]
			if len(self.box) == 4:
				min_x = min([x for x, y in self.box])
				max_x = max([x for x, y in self.box])
				min_y = min([y for x, y in self.box])
				max_y = max([y for x, y in self.box])

			bed = dict(type=bed_type,x_min=min_x,x_max=max_x,y_min=min_y,y_max=max_y,z_min=min_z,z_max=max_z)
			self._bedlevelvisualizer_logger.debug(bed)

			if self.old_marlin or self.repetier_firmware:
				a = np.swapaxes(self.mesh,1,0)
				x = np.unique(a[0]).astype(np.float)
				y = np.unique(a[1]).astype(np.float)
				z = a[2].reshape((len(x),len(y)))
				self._bedlevelvisualizer_logger.debug(a)
				self._bedlevelvisualizer_logger.debug(x)
				self._bedlevelvisualizer_logger.debug(y)
				self._bedlevelvisualizer_logger.debug(z)
				offset = 0
				if self.old_marlin:
					offset = self.old_marlin_offset
				self._bedlevelvisualizer_logger.debug(offset)
				self.mesh = np.subtract(z, [offset], dtype=np.float, casting='unsafe').tolist()
				self._bedlevelvisualizer_logger.debug(self.mesh)

			self.processing = False
			self._bedlevelvisualizer_logger.debug("stopping mesh collection")
			if bool(self.flip_y) != bool(self._settings.get(["flipY"])):
				self._bedlevelvisualizer_logger.debug("flipping y axis")
				self.mesh.reverse()

			if self._settings.get(["use_relative_offsets"]):
				self._bedlevelvisualizer_logger.debug("using relative offsets")
				self.mesh = np.array(self.mesh)
				if self._settings.get(["use_center_origin"]):
					self._bedlevelvisualizer_logger.debug("using center origin")
					self.mesh = np.subtract(self.mesh, self.mesh[len(self.mesh[0])/2,len(self.mesh)/2], dtype=np.float, casting='unsafe').tolist()
				else:
					self.mesh = np.subtract(self.mesh, self.mesh[0,0], dtype=np.float, casting='unsafe').tolist()

			if int(self._settings.get(["rotation"])) > 0:
				self._bedlevelvisualizer_logger.debug("rotating mesh by %s" % self._settings.get(["rotation"]))
				self.mesh = np.array(self.mesh)
				self.mesh = np.rot90(self.mesh, int(self._settings.get(["rotation"]))/90).tolist()

			self._bedlevelvisualizer_logger.debug(self.mesh)


			self._plugin_manager.send_plugin_message(self._identifier, dict(mesh=self.mesh,bed=bed))

		return line

	##~~ SimpleApiPlugin mixin
	def get_api_commands(self):
		return dict(stopProcessing=[])

	def on_api_get(self, request):
		if request.args.get("stopProcessing"):
			self._bedlevelvisualizer_logger.debug("Canceling mesh collection per user request")
			self._bedlevelvisualizer_logger.debug("Mesh data collected prior to cancel:")
			self._bedlevelvisualizer_logger.debug(self.mesh)
			self.processing = False
			self.mesh_collection_canceled = True
			self.mesh = []
			self._bedlevelvisualizer_logger.debug("Mesh data after clearing:")
			self._bedlevelvisualizer_logger.debug(self.mesh)
			response = dict(stopped=True)
			return flask.jsonify(response)

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
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = bedlevelvisualizer()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.comm.protocol.gcode.sending": __plugin_implementation__.flagMeshCollection,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.processGCODE,
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
