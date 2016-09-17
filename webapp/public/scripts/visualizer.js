'use strict';

angular.module('swimmerApp').factory('visualizer', ['_', 'd3', function (_, d3) {

    var linksData;
    var simulation;

    var dim;
    var svg;
    var w;

    var linkG, nodeG;
    var link, node;

    var self = this;

    //used for add/remove - communicate with main.js
    var clickedIds = [];

    /* interactoin when a node is dragged */
    function moveAthleteName(id) {
        var draggedNode = nodeG.select('circle[id=\'' + id + '\']');
        nodeG.select('#vis-athlete-name-' + id)
            .transition()
            .attr('x', draggedNode.attr('cx'))
            .attr('y', draggedNode.attr('cy'));
    }

    function checkSimulationStatus(id) {
        var selectedNodeId = id;

        //check if simulation stopped every 0.2 second
        function isStopped() {
            if (simulation.alpha() < 0.05) {
                moveAthleteName(selectedNodeId);
            } else {
                setTimeout(isStopped, 200);
            }
        }
        isStopped();
    }

    function dragstarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.5).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d, isClicked) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;

        //check simluation status
        if (isClicked) {
            checkSimulationStatus(d.id);
        }
    }

    /* interaction when vis is initiated */
    function ticked() {
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });
        node.attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
    }

    function checkInitDone(completeLoading) {
        //check if simulation stopped every 0.2 second
        function isAlmostDone() {
            if (simulation.alpha() < 0.2) {
                console.log('6.vis, initiation done');
                completeLoading();
            } else {
                setTimeout(isAlmostDone, 200);
            }
        }
        isAlmostDone();
    }

    function showAthleteName(obj, d) {
        nodeG.append('text')
            .text(d.name)
            .attr('x', d.x)
            .attr('y', d.y)
            .attr('dy', -1 * parseInt(obj.attr('r')) - 6)
            .attr('class', 'size-tiny unselectable pos-middle vis-athlete-name')
            .attr('id', 'vis-athlete-name-' + d.id);
    }

    /* interaction when node is hovered, out, and clicked */
    function showMouseover(obj, d) {

        if (obj.attr('clicked') === 'false') {
            //change the node color
            obj.attr('class', 'node-over');
            //add athlete's name
            showAthleteName(obj, d);
        }

        //highlight connected link
        var connected = _.chain(linksData)
            .filter(function (l) {
                return l.source === d.id || l.target === d.id;
            })
            .map(function (l) {
                return d.id === l.source ? l.target : l.source;
            })
            .unique()
            .value();

        //highlight links and linked nodes
        _.each(connected, function (c) {
            linkG.select('line[id=\'' + c + '-' + d.id + '\']')
                .attr('class', 'link-over');
            linkG.select('line[id=\'' + d.id + '-' + c + '\']')
                .attr('class', 'link-over');
            nodeG.select('circle[id=\'' + c + '\']')
                .attr('class', 'node-linked');
        });

        //add html
        document.getElementById('swimmer').innerHTML =
            '<i>' + d.name +
            '</i> competed against <i>' + connected.length + '</i> swimmer' +
            (connected.length > 1 ? 's' : '') +
            ' at <i>' +  d.records.length + '</i> races';
    }

    function showMouseout(obj, d) {
        //return only if it's not unclicked
        if (obj.attr('clicked') === 'false') {
            obj.attr('class', 'node-normal');
            nodeG.select('#vis-athlete-name-' + d.id).remove();
        }
        if (obj.attr('linked') === 'true') {
            obj.attr('class', 'node-mutual-linked');
        }
        //revert all highlighted (linked) links and nodes
        linkG.selectAll('.link-over').attr('class', function () {
            return d3.select(this).attr('linked') === 'true' ? 'link-mutual-linked' : 'link-normal';
        });
        nodeG.selectAll('.node-linked').attr('class', function () {
            return d3.select(this).attr('clicked') === 'true' ?
                'node-clicked' : //if previously clicked
                (d3.select(this).attr('linked') === 'true' ? 'node-mutual-linked' : 'node-normal');
        });
        document.getElementById('swimmer').innerHTML = '';
    }

    this.revertFocusedAthlete = function (clickedIndex, aId, obj) {
        if (_.isUndefined(obj)) {
            obj = nodeG.select('circle[id=\'' + aId + '\']');
        }
        clickedIds.splice(clickedIndex, 1);
        //vis revert to normal
        obj.attr('clicked', 'false').attr('class', 'node-normal');
        nodeG.select('#vis-athlete-name-' + aId).remove();
    };

    function showClick(obj, d, showAthleteCb, hideAthleteCb) {
        if (obj.attr('clicked') === 'false') { //show
            clickedIds.push(d.id);
            obj.attr('clicked', 'true').attr('class', 'node-clicked');
            showAthleteCb(d); //call back to main.js
        } else { //hide
            var clickedIndex = clickedIds.indexOf(d.id);
            self.revertFocusedAthlete(clickedIndex, d.id, obj);
            hideAthleteCb(clickedIndex); //call back to main.js
        }
    }

    //TODO: sometimes the vis is frozen at the beginning
    this.drawVis = function (graph, pointRange, width, completeLoadingCb, showAthleteCb, hideAthleteCb) {

        //reset vis
        linksData = angular.copy(graph.links);
        if (linkG) {
            linkG.remove();
        }
        if (nodeG) {
            nodeG.remove();
        }

        //TODO: meticulous distance depending on the node length
        //TODO: zoom in /pan
        console.log('5.vis, vis started');

        if (width) {
            w = width;
            dim = width * 0.6;
            svg = d3.select('#vis').attr('height', dim);
        } else {
            width = dim / 0.6;
        }

        //1: no animation at first, 0: move more, dispersed
        var decayRange = d3.scaleLinear().range([0.5, 1]).domain([1, 800]);

        simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(function (d) {
                return d.id;
            })
            .distance(function () {
                return dim / 5;
            }))
            .velocityDecay(Math.max(Math.min(decayRange(graph.nodes.length), 1), 0.2))
            .force('charge', d3.forceManyBody()
                .strength( -1 * dim / 5)
                .distanceMax(dim / 2)
            )
            .force('center', d3.forceCenter(width / 2, dim / 2));

        //link as lines
        linkG = svg.append('g')
            .attr('class', 'links');
        link = linkG.selectAll('line')
            .data(graph.links)
            .enter().append('line')
            .attr('stroke-width', function (d) {
                return d.value * 0.5;
            })
            .attr('class', 'link-normal')
            .attr('id', function (d) {
                return d.source + '-' + d.target;
            });

        //node as circles
        //set radius size (min: 4), point range min is roughly 700
        var radius = d3.scaleLinear()
            .range([4, graph.nodes.length * 1.6])
            .domain(pointRange);

        nodeG = svg.append('g')
            .attr('class', 'nodes');
        node = nodeG.selectAll('circle')
            .data(graph.nodes)
            .enter().append('circle')
            .attr('id', function (d) {
                return d.id;
            })
            .attr('r', function (d) {
                var points = _.pluck(d.records, 'point');
                var total = _.reduce(points, function (memo, num) {
                    return memo + num;
                }, 0);
                return Math.sqrt(radius(total));
            })
            .attr('clicked', 'false')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', function (d) {
                    return dragended(d, d.clicked);
                }))
            .on('mouseover', function (d) {
                showMouseover(d3.select(this), d);
            })
            .on('mouseout', function (d) {
                showMouseout(d3.select(this), d);
            })
            .on('click', function (d) {
                //TODO: set click toggle - remove
                showClick(d3.select(this), d, showAthleteCb, hideAthleteCb);
            });

        simulation.nodes(graph.nodes).on('tick', ticked);
        simulation.force('link').links(graph.links);

        //check the simulation status-->then set loading done
        checkInitDone(completeLoadingCb);
    };

    /* updated from the race selection at HTML */
    this.updateFocusedAthletes = function (athletes) {

        //make the node clicked status
        nodeG.selectAll('circle')
            .filter(function (d) {
                var isSelected = _.contains(_.pluck(athletes, 'id'), d.id);
                //show clicked athletes name above the node
                if (isSelected) {
                    showAthleteName(d3.select(this), d);
                }
                return isSelected;
            })
            .attr('clicked', 'true')
            .attr('class', 'node-clicked');

        //set clicked ids
        clickedIds = _.pluck(athletes, 'id');
    };
    this.resetClickedAthletes = function () {
        nodeG.selectAll('circle')
            .attr('clicked', 'false')
            .attr('class', 'node-normal');
        nodeG.selectAll('.vis-athlete-name').remove();
        clickedIds = [];
    };

    /* toggle linked nodes/edges with all focused athletes */
    this.highlightLinkeNodes = function (ids) {
        nodeG.selectAll('circle')
            .filter(function (d) {
                return _.contains(ids, d.id);
            })
            .attr('linked', 'true')
            .attr('class', 'node-mutual-linked');
        //highlight links
        _.each(clickedIds, function (c, i) {
            _.each(ids.concat(_.clone(clickedIds).splice(i)), function (id) {
                linkG.select('line[id=\'' + c + '-' + id + '\']')
                    .attr('linked', 'true')
                    .attr('class', 'link-mutual-linked');
                linkG.select('line[id=\'' + id + '-' + c + '\']')
                    .attr('linked', 'true')
                    .attr('class', 'link-mutual-linked');
            });
        });
    };
    this.hideLinkeNodes = function () {
        nodeG.selectAll('.node-mutual-linked').attr('linked', 'false').attr('class', 'node-normal');
        linkG.selectAll('.link-mutual-linked').attr('linked', 'false').attr('class', 'link-normal');
    };

    return this;
}]);
