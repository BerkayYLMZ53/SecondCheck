import { Text, View } from 'react-native';
import type { Product } from '../types/product';
import type { SavedItem } from '../types/savedListing';
import { savedPriceDetails } from '../utils/savedListings';
import { useDetailStyles } from './detailStyles';

export const savedMoney = (value: number): string =>
  `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
export default function SavedListingSummary({
  item,
  product,
}: {
  item: SavedItem;
  product: Product | undefined;
}) {
  const { colors, shared } = useDetailStyles();
  const details = product ? savedPriceDetails(item, product) : null;
  return (
    <>
      <Text style={shared.title}>{item.title}</Text>
      <Text style={shared.body}>
        {product?.name ?? 'Bu ürün artık katalogda bulunmuyor.'}
      </Text>
      <View style={shared.row}>
        <Text style={shared.heading}>{savedMoney(item.askedPrice)}</Text>
        <Text style={shared.caption}>
          {new Date(item.date).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      {details && (
        <>
          <Text style={shared.caption}>{details.conditionLabel}</Text>
          <Text style={shared.caption}>
            {item.condition === 'faulty'
              ? 'Sağlam cihaz piyasa referansı'
              : 'Kondisyona göre adil değer'}
            : {savedMoney(details.fairPrice)}
          </Text>
          <Text
            testID="saved-listing-difference"
            style={[
              shared.title,
              {
                color:
                  details.difference < 0
                    ? colors.successText
                    : details.difference > 0
                      ? colors.dangerText
                      : colors.accent,
              },
            ]}
          >
            {details.difference === 0
              ? 'Piyasa değerinde'
              : `${details.difference > 0 ? '+' : '−'}${savedMoney(Math.abs(details.difference))} ${details.difference < 0 ? 'Hesaplı' : 'Pahalı'}`}
          </Text>
          {item.condition === 'faulty' && (
            <Text style={shared.caption}>
              Onarım masrafı bu farka dahil değildir.
            </Text>
          )}
        </>
      )}
    </>
  );
}
