import ClusterListPage from './ClusterListPage'

export default function ReturnList() {
  return (
    <ClusterListPage
      requestType="return"
      title="מוצרים שהתגעגענו אליהם"
      subtitle="מוצרים שכבר היו בפרויקט בעבר ואתם רוצים שיחזרו"
    />
  )
}
