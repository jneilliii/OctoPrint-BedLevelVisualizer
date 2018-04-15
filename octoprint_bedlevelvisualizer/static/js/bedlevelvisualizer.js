$(function () {
	function bedlevelvisualizerViewModel(parameters) {
		var self = this;

		self.settingsViewModel = parameters[0];
		self.controlViewModel = parameters[1];
		self.loginStateViewModel = parameters[2];

		self.processing = ko.observable(false);
		self.mesh_data = ko.observableArray();
		
		self.onBeforeBinding = function() {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
		}

		self.onDataUpdaterPluginMessage = function (plugin, mesh_data) {
			if (plugin !== "bedlevelvisualizer") {
				return;
			}
			if (mesh_data.mesh) {
				self.drawMesh(mesh_data.mesh);
			}
			return;
		};

		self.drawMesh = function (mesh_data) {
			if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh()) {
				self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh(mesh_data);
				self.settingsViewModel.saveData();
			}
			self.processing(false);
			OctoPrint.control.sendGcode('M155 S3');
			var data = [{
					z: mesh_data,
					type: 'surface'
				}
			];

			var layout = {
				//title: 'Bed Leveling Mesh',
				autosize: true,
				margin: {
					l: 0,
					r: 0,
					b: 0,
					t: 0
				},
				scene: {
					camera: {
						eye: {
							x: -1.25,
							y: -1.25,
							z: 1.25
						}
					}
				}
			};
			Plotly.newPlot('bedlevelvisualizergraph', data, layout);
		};

		self.onAfterTabChange = function (current, previous) {
			if (current === "#tab_plugin_bedlevelvisualizer" && self.controlViewModel.isOperational() && !self.controlViewModel.isPrinting() && self.loginStateViewModel.isUser() && !self.processing()) {
				if (!self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh().length > 0) {
					self.updateMesh();
				} else {
					self.drawMesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
				}
				return;
			}
			if (previous === "#tab_plugin_bedlevelvisualizer") {
				Plotly.purge('bedlevelvisualizergraph');
			}
		};

		self.updateMesh = function () {
			self.processing(true);
			OctoPrint.control.sendGcode('M155 S0');
			OctoPrint.control.sendGcode(self.settingsViewModel.settings.plugins.bedlevelvisualizer.command().split("\n"));
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: bedlevelvisualizerViewModel,
		dependencies: ["settingsViewModel", "controlViewModel", "loginStateViewModel"],
		elements: ["#settings_plugin_bedlevelvisualizer", "#tab_plugin_bedlevelvisualizer"]
	});
});
