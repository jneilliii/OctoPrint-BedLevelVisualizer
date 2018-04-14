$(function () {
	function bedlevelvisualizerViewModel(parameters) {
		var self = this;
		
		self.settingsViewModel = parameters[0];
		self.controlViewModel = parameters[1];
		self.loginStateViewModel = parameters[2];
		
		self.processing = ko.observable(false);
		self.loadedData = ko.observableArray();
		
		self.onDataUpdaterPluginMessage = function(plugin, data) {
			if (plugin != "bedlevelvisualizer") {
				return;
			}
			if (data.mesh) {
				var raw_data = data.mesh;
				var eye_x = ((raw_data[0].length/2)*-1);
				var eye_y = ((raw_data.length/2)*-1);
				console.log(eye_x+'|'+eye_y);
				self.processing(false);
				self.controlViewModel.sendCustomCommand({type:'command',command:'M155 S3'});
 				var data = [{
					z: raw_data,
					type: 'surface'
				}];
				
				var layout = {
					//title: 'Bed Leveling Mesh',
					autosize: true,
					margin: {
						l: 0,
						r: 0,
						b: 0,
						t: 0,
						},
					scene: {
						camera: {
							eye: {
								x: eye_x,
								y: eye_x,
								z: 1.25
								}
							}
						}
					};
				Plotly.newPlot('bedlevelvisualizergraph', data, layout);
				self.loadedData(data.mesh);
			}
		}
		
		self.onAfterTabChange = function (current, previous) {
			if (current == "#tab_plugin_bedlevelvisualizer" && self.controlViewModel.isOperational() && !self.controlViewModel.isPrinting() && self.loginStateViewModel.isUser() && !self.processing()) {
				if(!self.loadedData().length > 0) {
					self.updateMesh();
				}
			}
		};
		
		self.updateMesh = function(){
			self.processing(true);
			self.controlViewModel.sendCustomCommand({type:'command',command:'M155 S0'});
			self.controlViewModel.sendCustomCommand({type:'command',command:'G29 T1'});
		}
	}
	
	OCTOPRINT_VIEWMODELS.push({
			construct: bedlevelvisualizerViewModel,
			dependencies: [ "settingsViewModel","controlViewModel","loginStateViewModel" ],
			elements:[ "#tab_plugin_bedlevelvisualizer" ]
	});
});