# coding=utf-8
from __future__ import absolute_import

import threading

import octoprint.plugin
from octoprint.events import Events
import re
import logging
import flask
import json
from copy import deepcopy

class bedlevelvisualizer(
	octoprint.plugin.StartupPlugin,
	octoprint.plugin.TemplatePlugin,
	octoprint.plugin.AssetPlugin,
	octoprint.plugin.SettingsPlugin,
	octoprint.plugin.WizardPlugin,
	octoprint.plugin.SimpleApiPlugin,
	octoprint.plugin.EventHandlerPlugin,
	octoprint.plugin.BlueprintPlugin,
):
	INTERVAL = 2.0
	MAX_HISTORY = 10

	def __init__(self):
		self.processing = False
		self.printing = False
		self.mesh_collection_canceled = False
		self.old_marlin = False
		self.makergear = False
		self.old_marlin_offset = 0
		self.repetier_firmware = False
		self.mesh = []
		self.bed = {}
		self.bed_type = None
		self.box = []
		self.flip_x = False
		self.flip_y = False
		self.timeout_override = False
		self._logger = logging.getLogger(
			"octoprint.plugins.bedlevelvisualizer")
		self._bedlevelvisualizer_logger = logging.getLogger(
			"octoprint.plugins.bedlevelvisualizer.debug"
		)
		self.regex_mesh_data = re.compile(
			r"^((G33.+)|(Bed.+)|(Llit.+)|(\d+\s)|(\|\s*)|(\s*\[\s+)|(\[?\s?\+?-?\d+?\.\d+\]?\s*,?)|(\s?\.\s*)|(NAN,"
			r"?)|(nan\s?,?)|(=======\s?,?))+(\s+\],?)?$"
		)
		self.regex_bed_level_correction = re.compile(
			r"^(Mesh )?Bed Level (Correction Matrix|data):.*$"
		)
		self.regex_nans = re.compile(r"^(nan\s?,?)+$")
		self.regex_equal_signs = re.compile(r"^(=======\s?,?)+$")
		self.regex_mesh_data_extraction = re.compile(r"(\+?-?\d*\.\d*)")
		self.regex_old_marlin = re.compile(r"^(Bed x:.+)|(Llit x:.+)$")
		self.regex_makergear = re.compile(
			r"^(\s=\s\[)(\s*,?\s*\[(\s?-?\d+.\d+,?)+\])+\];?$"
		)
		self.regex_repetier = re.compile(r"^G33 X.+$")
		self.regex_nan = re.compile(r"(nan)")
		self.regex_catmull = re.compile(
			r"^Subdivided with CATMULL ROM Leveling Grid:.*$"
		)
		self.regex_extracted_box = re.compile(r"\(\s*(\d+),\s*(\d+)\)")
		self.regex_eqn_coefficients = re.compile(r"^Eqn coefficients:.+$")
		self.regex_unknown_command = re.compile(
			r"echo:Unknown command: \"@BEDLEVELVISUALIZER\""
		)

	# SettingsPlugin

	def get_settings_defaults(self):
		return dict(
			command="",
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
			show_stored_mesh_on_tab=False,
			imperial=False,
			descending_y=False,
			descending_x=False,
			debug_logging=False,
			commands=[],
			show_labels=True,
			show_webcam=False,
			graph_z_limits="-2,2",
			colorscale='[[0, "rebeccapurple"],[0.4, "rebeccapurple"],[0.45, "blue"],[0.5, "green"],[0.55, "yellow"],[0.6, "red"],[1, "red"]]',
			save_snapshots=False,
			camera_position="-1.25,-1.25,0.25",
			date_locale_format="",
			graph_height="450px",
			show_prusa_adjustments=False
		)

	def get_settings_version(self):
		return 1

	def on_settings_migrate(self, target, current=None):
		if current is None or current < 1:
			# Loop through commands adding new fields
			commands_new = []
			self._logger.info(self._settings.get(["commands"]))
			for command in self._settings.get(["commands"]):
				command["confirmation"] = False
				command["input"] = []
				command["message"] = ""
				commands_new.append(command)
			self._settings.set(["commands"], commands_new)

	def on_settings_save(self, data):
		old_debug_logging = self._settings.get_boolean(["debug_logging"])

		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

		new_debug_logging = self._settings.get_boolean(["debug_logging"])
		if old_debug_logging != new_debug_logging:
			if new_debug_logging:
				self._bedlevelvisualizer_logger.setLevel(logging.DEBUG)
			else:
				self._bedlevelvisualizer_logger.setLevel(logging.INFO)

	# StartupPlugin

	def on_startup(self, host, port):
		# setup customized logger
		from octoprint.logging.handlers import CleaningTimedRotatingFileHandler

		bedlevelvisualizer_logging_handler = CleaningTimedRotatingFileHandler(
			self._settings.get_plugin_logfile_path(postfix="debug"),
			when="D",
			backupCount=3,
		)
		bedlevelvisualizer_logging_handler.setFormatter(
			logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")
		)
		bedlevelvisualizer_logging_handler.setLevel(logging.DEBUG)

		self._bedlevelvisualizer_logger.addHandler(
			bedlevelvisualizer_logging_handler)
		self._bedlevelvisualizer_logger.setLevel(
			logging.DEBUG
			if self._settings.get_boolean(["debug_logging"])
			else logging.INFO
		)
		self._bedlevelvisualizer_logger.propagate = False

	def on_after_startup(self):
		self._logger.info("OctoPrint-BedLevelVisualizer loaded!")

	# AssetPlugin

	def get_assets(self):
		return dict(
			js=[
				"js/jquery-ui.min.js",
				"js/knockout-sortable.1.2.0.js",
				"js/fontawesome-iconpicker.js",
				"js/ko.iconpicker.js",
				"js/plotly.min.js",
				"js/bedlevelvisualizer.js",
			],
			css=[
				"css/font-awesome.min.css",
				"css/font-awesome-v4-shims.min.css",
				"css/fontawesome-iconpicker.css",
				"css/bedlevelvisualizer.css",
			],
		)

	# TemplatePlugin

	def get_template_vars(self):
		return {"plugin_version": self._plugin_version}

	# EventHandlePlugin

	def on_event(self, event, payload):
		# Cancelled Print Interpreted Event
		if event == Events.PRINT_FAILED and not self._printer.is_closed_or_error():
			self.printing = False
		# Print Started Event
		if event == Events.PRINT_STARTED:
			self.printing = True
		# Print Done Event
		if event == Events.PRINT_DONE:
			self.printing = False

	# atcommand hook

	def enable_mesh_collection(self):
		self.mesh = []
		self.box = []
		self._bedlevelvisualizer_logger.debug("mesh collection started")
		self.processing = True
		self._plugin_manager.send_plugin_message(
			self._identifier, dict(processing=True)
		)

	def flag_mesh_collection(self, comm_instance, phase, command, parameters, tags=None, *args, **kwargs):
		if command == "BEDLEVELVISUALIZER":
			if parameters:
				self._bedlevelvisualizer_logger.debug(
					"Timeout override: {}".format(parameters))
				self._plugin_manager.send_plugin_message(
					self._identifier, {"timeout_override": parameters})
			thread = threading.Thread(target=self.enable_mesh_collection)
			thread.daemon = True
			thread.start()
		return

	def process_gcode(self, comm, line, *args, **kwargs):
		if self.printing and line.strip() == "echo:BEDLEVELVISUALIZER":
			thread = threading.Thread(target=self.enable_mesh_collection)
			thread.daemon = True
			thread.start()
			return line
		if line.startswith("BLV"):
			self._plugin_manager.send_plugin_message(self._identifier, {"BLV": line.strip()})
			return line
		if not self.processing:
			return line

		if self._settings.get_boolean(
			["ignore_correction_matrix"]
		) and self.regex_bed_level_correction.match(line.strip()):
			line = "ok"

		if "ok" not in line:
			if self.regex_mesh_data.match(line.strip()):
				if self.regex_bed_level_correction.match(
					line.strip()
				) and not self._settings.get_boolean(["ignore_correction_matrix"]):
					self._bedlevelvisualizer_logger.debug(
						"resetting mesh to blank because of correction matrix"
					)
					self.mesh = []
					return line
				if self.regex_nans.match(line.strip()):
					self._bedlevelvisualizer_logger.debug(
						"stupid smoothieware issue..."
					)
					line = self.regex_nan.sub("0.0", line)
				if self.regex_equal_signs.match(line.strip()):
					self._bedlevelvisualizer_logger.debug(
						"stupid equal signs...")
					line = self.regex_equal_signs.sub("0.0", line)

				new_line = self.regex_mesh_data_extraction.findall(line)
				self._bedlevelvisualizer_logger.debug(new_line)

				if self.regex_old_marlin.match(line.strip()):
					self.old_marlin = True
					self._bedlevelvisualizer_logger.debug(
						"using old marlin flag")

				if self.regex_repetier.match(line.strip()):
					self.repetier_firmware = True
					self._bedlevelvisualizer_logger.debug(
						"using repetier flag")

				if self._settings.get_boolean(["stripFirst"]):
					new_line.pop(0)
				if len(new_line) > 0:
					self.mesh.append(new_line)

			elif self.regex_catmull.match(line.strip()):
				self._bedlevelvisualizer_logger.debug(
					"resetting mesh to blank because of CATMULL subdivision"
				)
				self.mesh = []

			elif self.regex_extracted_box.findall(line.strip()):
				box = self.regex_extracted_box.findall(line.strip())
				if len(box) == 2:
					self.box += [[float(x), float(y)] for x, y in box]
				if len(self.box) == 2:
					if self.box[0][0] > self.box[1][0]:
						self.flip_x = True
				if len(self.box) == 4:
					if self.box[0][1] > self.box[3][1]:
						self.flip_y = True

			if self.regex_makergear.match(line) is not None:
				self._bedlevelvisualizer_logger.debug(
					"using makergear format report")
				self.mesh = json.loads(
					line.strip().replace("= ", "").replace(";", ""))
				self.old_marlin = True
				self.makergear = True
				self._bedlevelvisualizer_logger.debug(self.mesh)
				line = "ok"

			if self.old_marlin and self.regex_eqn_coefficients.match(line.strip()):
				self.old_marlin_offset = self.regex_eqn_coefficients.sub(
					r"\2", line.strip()
				)
				self._bedlevelvisualizer_logger.debug(
					"using old marlin offset")

			if "Home XYZ first" in line or "Invalid mesh" in line:
				reason = "data is invalid" if "Invalid" in line else "homing required"
				self._bedlevelvisualizer_logger.debug(
					"stopping mesh collection because %s" % reason
				)

			if "Home XYZ first" in line:
				self._plugin_manager.send_plugin_message(
					self._identifier, dict(error=line.strip())
				)
				self.processing = False

		if ("ok" in line or (self.repetier_firmware and "T:" in line)) and len(
			self.mesh
		) > 0:
			octoprint_printer_profile = self._printer_profile_manager.get_current()
			volume = octoprint_printer_profile["volume"]
			self.bed_type = volume["formFactor"]
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

			self.bed = dict(
				type=self.bed_type,
				x_min=min_x,
				x_max=max_x,
				y_min=min_y,
				y_max=max_y,
				z_min=min_z,
				z_max=max_z,
			)
			self._bedlevelvisualizer_logger.debug(self.bed)

			if self.old_marlin or self.repetier_firmware:
				self.print_mesh_debug("initial mesh data: ", self.mesh)
				if self.makergear:
					a = self.mesh
				else:
					# rearrange matrix from point lists to coordinate lists
					a = list(zip(*self.mesh))
					self.print_mesh_debug("mesh after swapaxes: ", a)

				# filter coordinate values
				self.print_mesh_debug("a = ", a)
				x = self.unique_floats(a[0])
				self.print_mesh_debug("x = ", x)
				y = self.unique_floats(a[1])
				self.print_mesh_debug("y = ", y)
				rows, cols, vals = (len(y), len(x), len(list(a[2])))
				z = [[0 for i in range(cols)]
					 for j in range(rows)]  # init empty matrix
				k = 0
				# filling array
				for i in range(rows):
					for j in range(cols):
						z[i][j] = a[2][k]
						k += 1
				self.print_mesh_debug("z = ", z)

				# dealing with offset
				offset = 0
				if self.old_marlin:
					offset = self.old_marlin_offset
				self._bedlevelvisualizer_logger.debug(
					"mesh offset = " + str(offset))
				self.mesh = list(
					map(lambda y: list(map(lambda x: round(float(x) - offset, 4), y)), z))
				self.print_mesh_debug("mesh after offset: ", self.mesh)

			self._bedlevelvisualizer_logger.debug("stopping mesh collection")

			if bool(self.flip_x) != bool(self._settings.get(["flipX"])):
				self.mesh = list(map(lambda x: list(reversed(x)), self.mesh))
				self.print_mesh_debug("flipped x axis: ", self.mesh)

			if bool(self.flip_y) != bool(self._settings.get(["flipY"])):
				self.mesh.reverse()
				self.print_mesh_debug("flipped y axis: ", self.mesh)

			if self._settings.get_boolean(["use_relative_offsets"]):
				self._bedlevelvisualizer_logger.debug("using relative offsets")
				# shifting mesh down by origin point height
				if self._settings.get_boolean(["use_center_origin"]):
					self._bedlevelvisualizer_logger.debug(
						"using center origin")
					# finding origin point in center
					offset = self.mesh[len(self.mesh[0]) // 2][len(self.mesh) // 2]
					self.mesh = list(
						map(lambda y: list(map(lambda x: round(float(x) - float(offset), 4), y)), self.mesh))
				else:
					offset = self.mesh[0][0]
					self.mesh = list(
						map(lambda y: list(map(lambda x: round(float(x) - float(offset), 4), y)), self.mesh))

			if int(self._settings.get_int(["rotation"])) > 0:
				self._bedlevelvisualizer_logger.debug(
					"rotating mesh by %s degrees" % self._settings.get(["rotation"]))

				for i in range(int(self._settings.get_int(["rotation"]) / 90)):
					self.mesh = list(zip(*self.mesh))[::-1]

			if self.bed_type == "circular":
				y = len(self.mesh)
				x = len(self.mesh[0])
				circle_mask = self.create_circular_mask(y, x)
				for i in range(y):
					for j in range(x):
						if not circle_mask[i][j]:
							self.mesh[i][j] = None

			self.processing = False
			self.print_mesh_debug("Final mesh:", self.mesh)

			self._plugin_manager.send_plugin_message(
				self._identifier, dict(mesh=self.mesh, bed=self.bed)
			)
			self.send_mesh_data_collected_event(self.mesh, self.bed)

		return line

	def create_circular_mask(self, y, x):
		center = y/2-0.5, x/2-0.5
		radius = min(center[0], center[1], y - center[0], x - center[1])
		self._bedlevelvisualizer_logger.debug("Center = " + str(center) + ", Radius = " + str(radius))

		# init emply matrix
		mask = [[False for j in range(x)]
				for i in range(y)]
		# creating rough circular mask with wiggle room to surely include all points
		for i in range(y):
			for j in range(x):
				mask[i][j] = abs((i-center[0])**2 + (j-center[1])**2) - radius**2 < 1.5**2

		self.print_mesh_debug("mask:", mask)
		return mask

	# find all unique values in a list
	def unique_floats(self, list1):
		s_list = set(list1)
		u_list = (list(s_list))
		return list(map(float, u_list))

	# output mesh line by line, with right coordinate directions
	def print_mesh_debug(self, message, mesh):
		self._bedlevelvisualizer_logger.debug(message)
		l = len(mesh)
		# print mask data
		for i in range(l):
			self._bedlevelvisualizer_logger.debug(mesh[l-i-1])
		# print graphical representation
		if self.bed_type == "circular":
			pic = deepcopy(mesh)
			for i in range(l):
				for j in range(len(pic[0])):
					if pic[i][j] in [False, None, "."]:
						pic[i][j] = "·"
					else:
						pic[i][j] = "Ꚛ"
			for i in range(l):
				self._bedlevelvisualizer_logger.debug(pic[l-i-1])
		return

	# SimpleApiPlugin

	def get_api_commands(self):
		return dict(stopProcessing=[])

	def on_api_get(self, request):
		if request.args.get("stopProcessing"):
			self._bedlevelvisualizer_logger.debug(
				"Canceling mesh collection per user request"
			)
			self._bedlevelvisualizer_logger.debug(
				"Mesh data collected prior to cancel:"
			)
			self._bedlevelvisualizer_logger.debug(self.mesh)
			self.processing = False
			self.mesh_collection_canceled = True
			self.mesh = []
			self._bedlevelvisualizer_logger.debug("Mesh data after clearing:")
			self._bedlevelvisualizer_logger.debug(self.mesh)
			response = dict(stopped=True)
			return flask.jsonify(response)

	# Custom Action Hook

	def custom_action_handler(self, comm, line, action, *args, **kwargs):
		if not action == "BEDLEVELVISUALIZER_LEVELBED":
			return
		self._bedlevelvisualizer_logger.debug("Received BEDLEVELVISUALIZER_LEVELBED command.")
		self._printer.commands(self._settings.get(["command"]).split("\n"))
		return

	# Custom Event Hook

	def send_mesh_data_collected_event(self, mesh_data, bed_data):
		event = Events.PLUGIN_BEDLEVELVISUALIZER_MESH_DATA_COLLECTED
		custom_payload = dict(mesh=mesh_data, bed=bed_data)
		self._event_bus.fire(event, payload=custom_payload)

	def register_custom_events(*args, **kwargs):
		return ["mesh_data_collected"]

	# BluePrint routes

	@octoprint.plugin.BlueprintPlugin.route("bedlevelvisualizer")
	def bedlevelvisualizer_route(self):
		try:
			if len(self.mesh) > 0:
				mesh = self.mesh
				self._bedlevelvisualizer_logger.debug("using internal mesh for octodash view: {}".format(mesh))
			elif len(self._settings.get(["stored_mesh"])) > 0:
				mesh = self._settings.get(["stored_mesh"])
				self._bedlevelvisualizer_logger.debug("using stored mesh for octodash view: {}".format(mesh))
			bed = self.bed_type
			commands = self._settings.get(["command"]).split("\n")
			render_kwargs = {"mesh": mesh, "bed": bed, "commands": commands}
		except Exception as e:
			self._logger.debug("Bed Visualizer error: {}".format(e))
			render_kwargs = {"error": "{}".format(e)}
		response = flask.make_response(flask.render_template("bedlevelvisualizer_octodash.jinja2", **render_kwargs))
		response.headers["X-Frame-Options"] = ""
		return response

	def is_blueprint_protected(self):
		return False

	# Software Update Hook

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
				stable_branch=dict(
					name="Stable", branch="master", comittish=["master"]
				),
				prerelease_branches=[
					dict(
						name="Release Candidate",
						branch="rc",
						comittish=["rc", "master"],
					)
				],
				# update method: pip
				pip="https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/archive/{target_version}.zip",
			)
		)


__plugin_name__ = "Bed Visualizer"
__plugin_pythoncompat__ = ">=2.7,<4"


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = bedlevelvisualizer()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.comm.protocol.action": __plugin_implementation__.custom_action_handler,
		"octoprint.comm.protocol.atcommand.sending": __plugin_implementation__.flag_mesh_collection,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.process_gcode,
		"octoprint.events.register_custom_events": __plugin_implementation__.register_custom_events,
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
	}
