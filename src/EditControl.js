import { PropTypes } from 'prop-types';
import isEqual from 'fast-deep-equal';
import React, { useRef } from 'react';
import { useMap } from 'marwan-yasser-react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';

const eventHandlers = {
  onEdited: 'draw:edited',
  onDrawStart: 'draw:drawstart',
  onDrawStop: 'draw:drawstop',
  onDrawVertex: 'draw:drawvertex',
  onEditStart: 'draw:editstart',
  onEditMove: 'draw:editmove',
  onEditResize: 'draw:editresize',
  onEditVertex: 'draw:editvertex',
  onEditStop: 'draw:editstop',
  onDeleted: 'draw:deleted',
  onDeleteStart: 'draw:deletestart',
  onDeleteStop: 'draw:deletestop',
};

function EditControl(props) {
  const drawRef = useRef();
  const propsRef = useRef(props);
  const map = useMap();
  const context = map;
  context.layerContainer = L.featureGroup();
  map.addLayer(context.layerContainer);

  const onDrawCreate = (e) => {
    const { onCreated } = props;
    const container = map;
    context.layerContainer.addLayer(e.layer);
    onCreated && onCreated(e);
  };

  React.useEffect(() => {
    const { onMounted } = props;

    for (const key in eventHandlers) {
      map.on(eventHandlers[key], (evt) => {
        let handlers = Object.keys(eventHandlers).filter(
          (handler) => eventHandlers[handler] === evt.type
        );
        if (handlers.length === 1) {
          let handler = handlers[0];
          props[handler] && props[handler](evt);
        }
      });
    }
    map.on(L.Draw.Event.CREATED, onDrawCreate);
    drawRef.current = createDrawElement(props, context);
    map.addControl(drawRef.current);
    onMounted && onMounted(drawRef.current);

    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreate);

      for (const key in eventHandlers) {
        if (props[key]) {
          map.off(eventHandlers[key], props[key]);
        }
      }

      drawRef.current.remove(map);
    };
  }, [props.onCreated, props.onDeleted, props.onEdited]);

  React.useEffect(() => {
    if (
      isEqual(props.draw, propsRef.current.draw) &&
      isEqual(props.edit, propsRef.current.edit) &&
      props.position === propsRef.current.position
    ) {
      return;
    }

    if (drawRef.current) {
      map.removeControl(drawRef.current);
    }

    drawRef.current = createDrawElement(props, context);
    drawRef.current.addTo(map);

    const { onMounted } = props;
    onMounted && onMounted(drawRef.current);

    return () => {
      if (drawRef.current) {
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [props.draw, props.edit, props.position]);

  return () => {};
}

function createDrawElement(props, context) {
  const { layerContainer } = context;
  const { draw, edit, position } = props;
  const options = {
    edit: {
      ...edit,
      featureGroup: layerContainer,
    },
  };

  if (draw) {
    options.draw = { ...draw };
  }

  if (position) {
    options.position = position;
  }

  return new L.Control.Draw(options);
}

EditControl.propTypes = {
  ...Object.keys(eventHandlers).reduce((acc, val) => {
    acc[val] = PropTypes.func;
    return acc;
  }, {}),
  onCreated: PropTypes.func,
  onMounted: PropTypes.func,
  draw: PropTypes.shape({
    polyline: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    polygon: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    rectangle: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    circle: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    marker: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  }),
  edit: PropTypes.shape({
    edit: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    remove: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    poly: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    allowIntersection: PropTypes.bool,
  }),
  position: PropTypes.oneOf([
    'topright',
    'topleft',
    'bottomright',
    'bottomleft',
  ]),
  leaflet: PropTypes.shape({
    map: PropTypes.instanceOf(L.Map),
    layerContainer: PropTypes.shape({
      addLayer: PropTypes.func.isRequired,
      removeLayer: PropTypes.func.isRequired,
    }),
  }),
};

export default EditControl;
