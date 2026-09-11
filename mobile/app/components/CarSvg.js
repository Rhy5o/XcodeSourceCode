import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import api from '../utils/api';
import { colors } from '../utils/theme';

// React Native's <Image> has no native SVG decoder (unlike a web <img>,
// which renders SVG directly), so this fetches the raw SVG markup as text
// and hands it to react-native-svg's <SvgXml> to actually draw it.
export default function CarSvg({ carId, color, cacheBust, style }) {
    const [xml, setXml] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setXml(null);
        setFailed(false);
        api.getCarSvg(carId, { color, cacheBust })
            .then((svg) => {
                if (!cancelled) setXml(svg);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [carId, color, cacheBust]);

    return (
        <View style={[styles.container, style]}>
            {xml ? (
                <SvgXml xml={xml} width="100%" height="100%" />
            ) : failed ? null : (
                <ActivityIndicator color={colors.accent} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        aspectRatio: 2,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 10,
        overflow: 'hidden'
    }
});
