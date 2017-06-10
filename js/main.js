
function add_scene(scenedata, s){
	var d = scenedata;//.scene;

	if (d != undefined){
		var p = d;

		var mat = {};
		// create materials
		if (p.materials != undefined && p.materials.material != undefined){
			for (var i in p.materials.material){
				var col = p.materials.material[i]["colour"].split(" ");
				var colVec = new THREE.Color(parseFloat(col[0]), parseFloat(col[1]), parseFloat(col[2]));
				// add a property for this?
				if (p.materials.material[i]["@name"].search("light") < 0){
					p.materials.material[i]["_mat"] = new THREE.MeshLambertMaterial({ wireframe: false, color: colVec})
				}else{
					p.materials.material[i]["_mat"] = new THREE.MeshBasicMaterial({ wireframe: false, color: colVec})
				}
				mat[p.materials.material[i]["@name"]] = p.materials.material[i]["_mat"]; 
			}
		}
		var obj = {};
		// create objects
		if (p.objects != undefined && p.objects.object != undefined){
			for (var i in p.objects.object){
				if (p.objects.object[i]["@type"] == "simplemesh"){
					
					p.objects.object[i]["_obj"] = new THREE.Geometry(); 

					var verts = p.objects.object[i]["verts"].split(",")
					for (var v in verts){
						var vs = verts[v].trim().replace(/(\r\n|\n|\r)/gm,"").split(" ");
						p.objects.object[i]["_obj"].vertices.push(new THREE.Vector3(parseFloat(vs[0]), parseFloat(vs[1]), parseFloat(vs[2])));
					}
					
					var faces = p.objects.object[i]["tris"].split(",")
					for (var f in faces){
						var fs = faces[f].trim().replace(/(\r\n|\n|\r)/gm,"").split(" ");
						p.objects.object[i]["_obj"].faces.push( new THREE.Face3( parseInt(fs[0]), parseInt(fs[1]), parseInt(fs[2]) ) );
					}
					
					p.objects.object[i]["_obj"].computeFaceNormals();
					obj[p.objects.object[i]["@name"]] = p.objects.object[i]["_obj"];
				}else if(p.objects.object[i]["@type"] == "sphere"){
					var radius = p.objects.object[i]["radius"];
					p.objects.object[i]["_obj"] = new THREE.SphereGeometry( radius, 32, 32 );
					obj[p.objects.object[i]["@name"]] = p.objects.object[i]["_obj"];
				}
				else{
					console.log("Unknown object type '" + p.objects.object[i]["@type"] + "' on " + p.objects.object[i]["@name"])
				}
			}
		}
		if (p.scene != undefined ){
			if (p.scene.ambient != undefined){
				var amb = p.scene.ambient["colour"].split(" ");
				var ambVec = new THREE.Color(parseFloat(amb[0]), parseFloat(amb[1]), parseFloat(amb[2]));
				var alight = new THREE.AmbientLight( ambVec );
				p.scene.ambient["_amb"] = alight;
				s.add( alight );
			}
			
			if (p.scene.inst != undefined){
				for (var i in p.scene.inst){
					
					var type = p.scene.inst[i]["@type"];
					if (p.scene.inst[i]["matrix"] != undefined && type == "simplemesh" || type == "sphere"){
						var inst = new THREE.Mesh(obj[p.scene.inst[i]["@obj"]], mat[p.scene.inst[i]["@material"]]);
					
						var pos = p.scene.inst[i]["matrix"]["pos"].split(" ");
						var rot = p.scene.inst[i]["matrix"]["rot"].split(" ");
						
						// hmm, these minus signs can't be right, should look into that in simpletrace
						inst.rotation.x = parseFloat(rot[0]) * -(Math.PI/180);
						inst.rotation.y = parseFloat(rot[1]) * (Math.PI/180);
						inst.rotation.z = parseFloat(rot[2]) * -(Math.PI/180);
						
						inst.position.x = parseFloat(pos[0]);
						inst.position.y = parseFloat(pos[1]);
						inst.position.z = parseFloat(pos[2]);
						inst.receiveShadow = true;
						inst.castShadow = true;
						p.scene.inst[i]["_inst"] = inst;
						s.add(p.scene.inst[i]["_inst"])
					
						if(p.scene.inst[i]["@light"] != undefined){
							var light = new THREE.SpotLight(mat[p.scene.inst[i]["@material"]].color);
							light.castShadow = true;
							
							light.position.set(inst.position.x, inst.position.y, inst.position.z);
							var targetVec = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(inst.rotation.x, inst.rotation.y, inst.rotation.z));
							light.target.position.set(light.position.x+targetVec.x, light.position.y+targetVec.y, light.position.z+targetVec.z );
							light.shadow.camera.near = 0.2;
														
							light.shadow.mapSize.width = 1024;
							light.shadow.mapSize.height = 1024;

							light.shadow.camera.far = 5;
							light.shadow.camera.fov = 120;
							light.shadow.bias = 0.0001;
					
							s.add( light );
							s.add( light.target )
						//	s.add(new THREE.CameraHelper( light.shadow.camera ))
						}
					}
				}
			}
		}
	}
	console.log(d)
}

function parseXml(xml) {
   var dom = null;
   if (window.DOMParser) {
      try { 
         dom = (new DOMParser()).parseFromString(xml, "text/xml"); 
      } 
      catch (e) { dom = null; }
   }
   else if (window.ActiveXObject) {
      try {
         dom = new ActiveXObject('Microsoft.XMLDOM');
         dom.async = false;
         if (!dom.loadXML(xml)) // parse error ..

            window.alert(dom.parseError.reason + dom.parseError.srcText);
      } 
      catch (e) { dom = null; }
   }
   else
      alert("cannot parse xml string!");
   return dom;
}

$(document).ready(function() {
	
	var $viewcell = $("#view_cell");
	
	// init 3d
	var scene = new THREE.Scene();

	// fetch scene
	fetch("https://raw.githubusercontent.com/daddycoder0/simpletrace/master/scene.xml")
			.then(function(response){
				response.text().then(function(text){
				var xml = parseXml(text);
				var json = xml2json(xml, "\t");
				//console.log(json)
				var scenedata = JSON.parse(json)["root"];
				// add my scene
				add_scene(scenedata, scene);
			}).catch(function(reason) {
			   console.log("Catch: " + reason)
			});
		})
	
	var camera = new THREE.PerspectiveCamera( 55, $viewcell.width()/$viewcell.height(), 0.1, 1000 );

	var renderer = new THREE.WebGLRenderer({antialias: true});
	
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setSize( $viewcell.width(), $viewcell.height() );
	
	document.getElementById("view_cell").appendChild( renderer.domElement );

	//var geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
	//var material = new THREE.MeshLambertMaterial( { color: 0x00ffff } );
	//var cube = new THREE.Mesh( geometry, material );
	//cube.castShadow = true;
	//scene.add( cube );

	// TODO (read cameras from scene and give user a list)
	camera.position.x = 3;
	camera.position.y = 0.5;
	camera.position.z = 0;
	camera.lookAt(new THREE.Vector3(0,0,0));
	
	var controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	window.addEventListener( 'resize', onWindowResize, false );

	function onWindowResize(){

		var w = $("#view_cell").width();
		var h = $("#view_cell").height();
		camera.aspect = w/h;
		camera.updateProjectionMatrix();

		renderer.setSize( w, h );

	}
	
	var render = function () {
		requestAnimationFrame( render );
		//cube.rotation.x += 0.03;
		//cube.rotation.y += 0.03;
		controls.update()
		renderer.render(scene, camera);
		};
			
	render();

});